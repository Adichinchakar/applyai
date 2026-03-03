import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { scoreJobFit } from '@/lib/scoring/fit-scorer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/jobs/score-batch
 *
 * Scores up to N unscored jobs automatically.
 * Uses SSE to stream progress back so the UI can show a live counter.
 *
 * Body: { limit?: number }  — defaults to 10 per call to stay within rate limits.
 *
 * SSE events:
 *   { type: 'progress', jobId, title, score, recommendation, index, total }
 *   { type: 'error',    jobId, title, error }
 *   { type: 'done',     scored, failed, total }
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit) || 10, 25); // cap at 25 per call

  const db = getDb();

  // Find unscored jobs that have a JD (can't score without description)
  const rows = db.prepare(`
    SELECT * FROM jobs
    WHERE fit_score IS NULL
      AND jd_raw IS NOT NULL
      AND jd_raw != ''
    ORDER BY discovered_at DESC
    LIMIT ?
  `).all(limit);

  const jobs = rows
    .map(r => rowToJob(r as Record<string, unknown>))
    .filter(Boolean);

  if (jobs.length === 0) {
    return NextResponse.json({ message: 'No unscored jobs with descriptions found', scored: 0 });
  }

  // Stream progress via SSE
  const encoder = new TextEncoder();
  let scored = 0;
  let failed = 0;
  let apply = 0;
  let skip = 0;
  let reachOut = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!;
        try {
          const result = await scoreJobFit(job.title, job.company, job.jdRaw!);

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
            job.id
          );

          logEvent(job.id, 'batch_scored', `Score: ${result.overall}/10 — ${result.applyRecommendation}`);
          scored++;
          if (result.applyRecommendation === 'apply') apply++;
          else if (result.applyRecommendation === 'skip') skip++;
          else if (result.applyRecommendation === 'reach_out_first') reachOut++;

          send({
            type: 'progress',
            jobId: job.id,
            title: job.title,
            company: job.company,
            score: result.overall,
            recommendation: result.applyRecommendation,
            index: i + 1,
            total: jobs.length,
          });
        } catch (err) {
          failed++;
          send({
            type: 'error',
            jobId: job.id,
            title: job.title,
            error: err instanceof Error ? err.message : 'Score failed',
          });
        }

        // Small delay between calls to respect rate limits
        if (i < jobs.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      send({ type: 'done', scored, failed, total: jobs.length, apply, skip, reachOut });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
