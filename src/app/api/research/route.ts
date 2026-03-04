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
    const rows = await db`SELECT * FROM jobs WHERE id = ${jobId}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = rowToJob(rows[0] as Record<string, unknown>);
    if (!job) {
      return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
    }

    const research = await researchCompany(job.company, job.companyDomain);

    await db`
      UPDATE jobs SET
        company_summary = ${research.companySummary},
        company_size = ${research.companySize},
        funding_stage = ${research.fundingStage},
        recent_news = ${JSON.stringify(research.recentNews)},
        researched_at = NOW(),
        updated_at = NOW()
      WHERE id = ${jobId}
    `;

    await logEvent(jobId, 'researched', `${research.companySize} / ${research.fundingStage}`);

    return NextResponse.json(research);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}
