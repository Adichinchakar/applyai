import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { researchCompany } from '@/lib/research/company-research';

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
    if (!job) {
      return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
    }

    const research = await researchCompany(job.company, job.companyDomain);

    db.prepare(`
      UPDATE jobs SET
        company_summary = ?,
        company_size = ?,
        funding_stage = ?,
        recent_news = ?,
        researched_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      research.companySummary,
      research.companySize,
      research.fundingStage,
      JSON.stringify(research.recentNews),
      jobId
    );

    logEvent(jobId, 'researched', `${research.companySize} / ${research.fundingStage}`);

    return NextResponse.json(research);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}
