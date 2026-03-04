import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

async function initDB() {
    console.log("Initializing database tables on Neon Postgres...");

    try {
        await sql`
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
        discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        fit_score INTEGER,
        skills_match INTEGER,
        seniority_match TEXT,
        domain_match INTEGER,
        red_flags JSONB,
        green_flags JSONB,
        talking_points JSONB,
        apply_recommendation TEXT,
        scored_at TIMESTAMP WITH TIME ZONE,

        company_summary TEXT,
        company_size TEXT,
        funding_stage TEXT,
        recent_news JSONB,
        glassdoor_rating REAL,
        researched_at TIMESTAMP WITH TIME ZONE,

        status TEXT DEFAULT 'discovered' CHECK(status IN (
          'discovered', 'scored', 'queued', 'cover_letter_ready',
          'applying', 'applied', 'viewed', 'interview', 'rejected', 'offer'
        )),
        cover_letter TEXT,
        tailored_resume_path TEXT,
        applied_at TIMESTAMP WITH TIME ZONE,
        follow_up_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

        await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_url ON jobs(job_url);
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS application_log (
        id BIGSERIAL PRIMARY KEY,
        job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

        console.log("Database tables initialized successfully!");
    } catch (error) {
        console.error("Failed to initialize remote tables:", error);
        process.exit(1);
    }
}

initDB();
