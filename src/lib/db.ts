import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import type { Job, RemoteType, ATSType, SeniorityMatch, ApplyRecommendation, ApplicationStatus } from '@/types';

const DB_PATH = path.join(process.cwd(), 'applyai.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for concurrent reads
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Run migrations
  initSchema(db);

  return db;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      company_domain TEXT,
      location TEXT,
      remote_type TEXT CHECK(remote_type IN ('remote', 'hybrid', 'onsite', 'unknown')),
      salary_min INTEGER,
      salary_max INTEGER,
      job_url TEXT NOT NULL UNIQUE,
      ats_type TEXT CHECK(ats_type IN ('greenhouse', 'lever', 'workday', 'linkedin', 'generic')),
      jd_raw TEXT,
      jd_summary TEXT,
      posted_at TEXT,
      discovered_at TEXT DEFAULT (datetime('now')),

      fit_score INTEGER,
      skills_match INTEGER,
      seniority_match TEXT,
      domain_match INTEGER,
      red_flags TEXT,
      green_flags TEXT,
      talking_points TEXT,
      apply_recommendation TEXT,
      scored_at TEXT,

      company_summary TEXT,
      company_size TEXT,
      funding_stage TEXT,
      recent_news TEXT,
      glassdoor_rating REAL,
      researched_at TEXT,

      status TEXT DEFAULT 'discovered' CHECK(status IN (
        'discovered', 'scored', 'queued', 'cover_letter_ready',
        'applying', 'applied', 'viewed', 'interview', 'rejected', 'offer'
      )),
      cover_letter TEXT,
      tailored_resume_path TEXT,
      applied_at TEXT,
      follow_up_at TEXT,
      notes TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_url ON jobs(job_url);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT REFERENCES jobs(id),
      event TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Helper to convert DB row to Job type
export function rowToJob(row: Record<string, unknown>): Job | null {
  if (!row) return null;
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    companyDomain: row.company_domain as string | undefined,
    location: row.location as string | undefined,
    remoteType: (row.remote_type as RemoteType) || 'unknown',
    salaryMin: row.salary_min as number | undefined,
    salaryMax: row.salary_max as number | undefined,
    jobUrl: row.job_url as string,
    atsType: row.ats_type as ATSType | undefined,
    jdRaw: row.jd_raw as string | undefined,
    jdSummary: row.jd_summary as string | undefined,
    postedAt: row.posted_at as string | undefined,
    discoveredAt: row.discovered_at as string,

    fitScore: row.fit_score as number | undefined,
    skillsMatch: row.skills_match as number | undefined,
    seniorityMatch: row.seniority_match as SeniorityMatch | undefined,
    domainMatch: row.domain_match as number | undefined,
    redFlags: row.red_flags ? JSON.parse(row.red_flags as string) as string[] : undefined,
    greenFlags: row.green_flags ? JSON.parse(row.green_flags as string) as string[] : undefined,
    talkingPoints: row.talking_points ? JSON.parse(row.talking_points as string) as string[] : undefined,
    applyRecommendation: row.apply_recommendation as ApplyRecommendation | undefined,
    scoredAt: row.scored_at as string | undefined,

    companySummary: row.company_summary as string | undefined,
    companySize: row.company_size as string | undefined,
    fundingStage: row.funding_stage as string | undefined,
    recentNews: row.recent_news ? JSON.parse(row.recent_news as string) as Array<{ title: string; url: string; date: string }> : undefined,
    glassdoorRating: row.glassdoor_rating as number | undefined,
    researchedAt: row.researched_at as string | undefined,

    status: (row.status as ApplicationStatus) || 'discovered',
    coverLetter: row.cover_letter as string | undefined,
    tailoredResumePath: row.tailored_resume_path as string | undefined,
    appliedAt: row.applied_at as string | undefined,
    followUpAt: row.follow_up_at as string | undefined,
    notes: row.notes as string | undefined,
  };
}

export function logEvent(jobId: string, event: string, details?: string): void {
  try {
    const database = getDb();
    database.prepare(
      'INSERT INTO application_log (job_id, event, details) VALUES (?, ?, ?)'
    ).run(jobId, event, details ?? null);
  } catch (e) {
    console.error('Failed to log event:', e);
  }
}
