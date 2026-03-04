import { neon } from '@neondatabase/serverless';
import type { Job, RemoteType, ATSType, SeniorityMatch, ApplyRecommendation, ApplicationStatus } from '@/types';

// Initialize the Neon Postgres client using the environment variable
const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

export function getDb() {
  return sql;
}

// Ensure the schema exists is no longer needed at runtime because it's handled by scripts/init-db.mjs

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
    postedAt: row.posted_at ? new Date(row.posted_at as string).toISOString() : undefined,
    discoveredAt: new Date(row.discovered_at as string).toISOString(),

    fitScore: row.fit_score as number | undefined,
    skillsMatch: row.skills_match as number | undefined,
    seniorityMatch: row.seniority_match as SeniorityMatch | undefined,
    domainMatch: row.domain_match as number | undefined,
    redFlags: row.red_flags ? (typeof row.red_flags === 'string' ? JSON.parse(row.red_flags) : row.red_flags) as string[] : undefined,
    greenFlags: row.green_flags ? (typeof row.green_flags === 'string' ? JSON.parse(row.green_flags) : row.green_flags) as string[] : undefined,
    talkingPoints: row.talking_points ? (typeof row.talking_points === 'string' ? JSON.parse(row.talking_points) : row.talking_points) as string[] : undefined,
    applyRecommendation: row.apply_recommendation as ApplyRecommendation | undefined,
    scoredAt: row.scored_at ? new Date(row.scored_at as string).toISOString() : undefined,

    companySummary: row.company_summary as string | undefined,
    companySize: row.company_size as string | undefined,
    fundingStage: row.funding_stage as string | undefined,
    recentNews: row.recent_news ? (typeof row.recent_news === 'string' ? JSON.parse(row.recent_news) : row.recent_news) as Array<{ title: string; url: string; date: string }> : undefined,
    glassdoorRating: row.glassdoor_rating as number | undefined,
    researchedAt: row.researched_at ? new Date(row.researched_at as string).toISOString() : undefined,

    status: (row.status as ApplicationStatus) || 'discovered',
    coverLetter: row.cover_letter as string | undefined,
    tailoredResumePath: row.tailored_resume_path as string | undefined,
    appliedAt: row.applied_at ? new Date(row.applied_at as string).toISOString() : undefined,
    followUpAt: row.follow_up_at ? new Date(row.follow_up_at as string).toISOString() : undefined,
    notes: row.notes as string | undefined,
  };
}

export async function logEvent(jobId: string, event: string, details?: string): Promise<void> {
  try {
    const database = getDb();
    await database`
      INSERT INTO application_log (job_id, event, details, created_at)
      VALUES (${jobId}, ${event}, ${details ?? null}, NOW())
    `;
  } catch (e) {
    console.error('Failed to log event:', e);
  }
}
