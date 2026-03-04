import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { tailorResume } from '@/lib/generation/resume-tailor';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const db = getDb();
    const rows = await db`SELECT * FROM jobs WHERE id = ${jobId}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = rowToJob(rows[0] as Record<string, unknown>);
    if (!job || !job.jdRaw) {
      return NextResponse.json({ error: 'Job has no description' }, { status: 400 });
    }

    const result = await tailorResume(job.title, job.company, job.jdRaw);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resume tailoring failed' },
      { status: 500 }
    );
  }
}
