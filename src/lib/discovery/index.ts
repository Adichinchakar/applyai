import { discoverRemoteOKJobs } from './remoteok';
import { discoverWeWorkRemotelyJobs } from './weworkremotely';
import { discoverRemotiveJobs } from './remotive';
import { extractCompanyDomain } from './domain-extractor';
import { getDb } from '@/lib/db';
import { DiscoveredJob } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface DiscoveryResult {
  discovered: number;
  newJobs: number;
  duplicates: number;
  filtered: number;
  sources: Record<string, number>;
}

// ─── Preference-based filtering ─────────────────────────────────────────────

/**
 * Builds a deduplicated list of lowercase keywords from the user's saved targetRoles.
 *
 * Strategy:
 *  1. Include each full role name (lowercase)
 *  2. Strip seniority prefixes (senior/staff/lead/etc.) and add the core phrase too
 *  3. Always include base design role keywords to cover common title variants
 *
 * e.g. "Senior Product Designer" → adds "senior product designer" + "product designer"
 */
function buildRoleKeywords(targetRoles: string[]): string[] {
  const SENIORITY_WORDS = new Set([
    'senior', 'staff', 'lead', 'principal', 'head', 'vp',
    'director', 'junior', 'mid', 'associate', 'founding',
  ]);
  const keywords = new Set<string>();

  for (const role of targetRoles) {
    const lower = role.toLowerCase().trim();
    keywords.add(lower);

    // Strip seniority modifiers to get the core role phrase
    const coreWords = lower.split(/\s+/).filter(w => !SENIORITY_WORDS.has(w));
    const core = coreWords.join(' ').trim();
    if (core.length > 3 && core !== lower) keywords.add(core);
  }

  // Base design role keywords — always included to catch common variants
  const BASE_DESIGN_KEYWORDS = [
    'product designer',
    'ux designer',
    'ui designer',
    'ui/ux designer',
    'product design',
    'design lead',
    'head of design',
    'design director',
    'vp of design',
    'vp, design',
    'interaction designer',
    'experience designer',
    'visual designer',
  ];

  for (const kw of BASE_DESIGN_KEYWORDS) {
    keywords.add(kw);
  }

  return Array.from(keywords);
}

/**
 * Returns true if the job title contains at least one role keyword.
 * Uses substring matching: "Sr. Product Designer" matches "product designer".
 */
function titleMatchesRoles(title: string, roleKeywords: string[]): boolean {
  const lower = title.toLowerCase();
  return roleKeywords.some(kw => lower.includes(kw));
}

/**
 * Returns true if the job satisfies the user's remote preference.
 *
 * 'remote'  → accept remote + unknown (unknown = not explicitly labelled, could be remote)
 * 'hybrid'  → accept remote + hybrid + unknown
 * 'onsite'  → accept all
 * 'any'     → accept all
 */
function satisfiesRemotePreference(job: DiscoveredJob, remotePreference: string): boolean {
  if (!remotePreference || remotePreference === 'any' || remotePreference === 'onsite') return true;
  if (remotePreference === 'hybrid') {
    return job.remoteType === 'remote' || job.remoteType === 'hybrid' || job.remoteType === 'unknown';
  }
  if (remotePreference === 'remote') {
    // 'unknown' passes — most remote-first job boards don't label jobs "remote" explicitly
    return job.remoteType === 'remote' || job.remoteType === 'unknown';
  }
  return true;
}

/**
 * Returns true if the job's salary meets the minimum, OR if no salary data is present.
 * Only rejects when salary is explicitly confirmed below the minimum.
 * Missing salary data is NOT penalised (most jobs don't list it).
 */
function satisfiesSalaryMin(job: DiscoveredJob, targetSalaryMin: number): boolean {
  if (!targetSalaryMin) return true;
  if (!job.salaryMax && !job.salaryMin) return true; // no data → let AI scorer decide
  const reportedMax = job.salaryMax || job.salaryMin || 0;
  return reportedMax >= targetSalaryMin;
}

// ─── Main orchestrator ───────────────────────────────────────────────────────

export async function runDiscovery(): Promise<DiscoveryResult> {
  const db = getDb();
  let preferences: Record<string, any> = {};
  const rows = await db`SELECT value FROM settings WHERE key = 'preferences'`;
  if (rows.length > 0) {
    preferences = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
  }

  const {
    targetRoles = [] as string[],
    targetLocations = ['Remote'] as string[],
    excludeCompanies = [] as string[],
    remotePreference = 'any',
    targetSalaryMin = 0,
  } = preferences;

  // Build keyword set from the user's saved targetRoles
  const roleKeywords = buildRoleKeywords(targetRoles);

  // Run all sources in parallel — each fails independently and returns []
  const [remoteokJobs, wwrJobs, remotiveJobs] = await Promise.all([
    discoverRemoteOKJobs(targetRoles).catch(() => [] as DiscoveredJob[]),
    discoverWeWorkRemotelyJobs().catch(() => [] as DiscoveredJob[]),
    discoverRemotiveJobs().catch(() => [] as DiscoveredJob[]),
  ]);

  // Track raw source counts (before any filtering)
  const sources: Record<string, number> = {
    remoteok: remoteokJobs.length,
    weworkremotely: wwrJobs.length,
    remotive: remotiveJobs.length,
  };

  const allJobs = [...remoteokJobs, ...wwrJobs, ...remotiveJobs];

  // ① Deduplicate by URL (in-memory pass before DB insert)
  const seen = new Set<string>();
  const uniqueJobs = allJobs.filter(job => {
    if (!job.jobUrl || seen.has(job.jobUrl)) return false;
    seen.add(job.jobUrl);
    return true;
  });

  // ② Enrich: auto-extract company domain if missing
  const enriched = uniqueJobs.map(job => ({
    ...job,
    companyDomain: job.companyDomain || extractCompanyDomain(job.jobUrl, job.company),
  }));

  // ③ Filter by user's saved preferences — the authoritative quality gate
  let filteredOut = 0;
  const preferenceFiltered = enriched.filter(job => {
    // Role match: title must contain at least one keyword derived from targetRoles
    if (!titleMatchesRoles(job.title, roleKeywords)) {
      filteredOut++;
      return false;
    }
    // Remote preference: honour the user's remote/hybrid/onsite setting
    if (!satisfiesRemotePreference(job, remotePreference)) {
      filteredOut++;
      return false;
    }
    // Salary: only reject when salary is explicitly confirmed to be too low
    if (!satisfiesSalaryMin(job, targetSalaryMin)) {
      filteredOut++;
      return false;
    }
    return true;
  });

  // ④ Filter excluded companies
  const filtered = preferenceFiltered.filter(job => {
    if (!excludeCompanies?.length) return true;
    return !excludeCompanies.some((excluded: string) =>
      job.company.toLowerCase().includes(excluded.toLowerCase())
    );
  });

  // ⑤ Save to database (ON CONFLICT DO NOTHING — job_url is UNIQUE)
  let newCount = 0;
  let duplicateCount = 0;

  for (const job of filtered) {
    try {
      const result = await db`
          INSERT INTO jobs (
            id, title, company, company_domain, location, remote_type,
            salary_min, salary_max, job_url, ats_type, jd_raw, posted_at, status
          ) VALUES (
            ${uuidv4()}, ${job.title}, ${job.company}, ${job.companyDomain || null}, ${job.location || null}, ${job.remoteType || 'unknown'},
            ${job.salaryMin || null}, ${job.salaryMax || null}, ${job.jobUrl}, ${job.atsType || 'generic'}, ${job.jdRaw || null}, ${job.postedAt || null}, 'discovered'
          )
          ON CONFLICT (job_url) DO NOTHING
          RETURNING id;
        `;

      if (result.length > 0) {
        newCount++;
      } else {
        duplicateCount++;
      }
    } catch {
      duplicateCount++;
    }
  }

  return {
    discovered: filtered.length,
    newJobs: newCount,
    duplicates: duplicateCount,
    filtered: filteredOut,
    sources,
  };
}
