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
    const rows = await db`SELECT * FROM jobs WHERE id = ${jobId}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = rowToJob(rows[0] as Record<string, unknown>);
    if (!job || !job.jdRaw) {
      return NextResponse.json({ error: 'Job has no description to score' }, { status: 400 });
    }

    const result = await scoreJobFit(job.title, job.company, job.jdRaw);

    await db`
      UPDATE jobs SET
        fit_score = ${result.overall},
        skills_match = ${result.skillsMatch},
        seniority_match = ${result.seniorityMatch},
        domain_match = ${result.domainMatch},
        red_flags = ${JSON.stringify(result.redFlags)},
        green_flags = ${JSON.stringify(result.greenFlags)},
        talking_points = ${JSON.stringify(result.talkingPoints)},
        apply_recommendation = ${result.applyRecommendation},
        status = 'scored',
        scored_at = NOW(),
        updated_at = NOW()
      WHERE id = ${jobId}
    `;

    await logEvent(jobId, 'scored', `Score: ${result.overall}/10 - ${result.applyRecommendation}`);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scoring failed' },
      { status: 500 }
    );
  }
}
