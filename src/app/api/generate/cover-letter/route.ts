import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { generateCoverLetter } from '@/lib/generation/cover-letter';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
    if (!job) {
      return NextResponse.json({ error: 'Invalid job data' }, { status: 400 });
    }

    const coverLetter = await generateCoverLetter(job, job.talkingPoints || []);

    await db`
      UPDATE jobs SET
        cover_letter = ${coverLetter},
        status = CASE WHEN status = 'scored' OR status = 'queued' THEN 'cover_letter_ready' ELSE status END,
        updated_at = NOW()
      WHERE id = ${jobId}
    `;

    await logEvent(jobId, 'cover_letter_generated', `${coverLetter.length} characters`);

    return NextResponse.json({ coverLetter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cover letter generation failed' },
      { status: 500 }
    );
  }
}
