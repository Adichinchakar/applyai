import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { scoreJobFit } from '@/lib/scoring/fit-scorer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // allow withRetry to wait up to 60s between attempts

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!row) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = rowToJob(row as Record<string, unknown>);
    if (!job || !job.jdRaw) {
      return NextResponse.json({ error: 'Job has no description to score' }, { status: 400 });
    }

    const result = await scoreJobFit(job.title, job.company, job.jdRaw);

    db.prepare(`
      UPDATE jobs SET
        fit_score = ?,
        skills_match = ?,
        seniority_match = ?,
        domain_match = ?,
        red_flags = ?,
        green_flags = ?,
        talking_points = ?,
        apply_recommendation = ?,
        status = 'scored',
        scored_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      result.overall,
      result.skillsMatch,
      result.seniorityMatch,
      result.domainMatch,
      JSON.stringify(result.redFlags),
      JSON.stringify(result.greenFlags),
      JSON.stringify(result.talkingPoints),
      result.applyRecommendation,
      jobId
    );

    logEvent(jobId, 'scored', `Score: ${result.overall}/10 - ${result.applyRecommendation}`);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scoring failed' },
      { status: 500 }
    );
  }
}
