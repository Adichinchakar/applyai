import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface DashboardStats {
  // Pipeline counts
  total: number;
  byStatus: Record<string, number>;

  // Scoring
  scored: number;
  avgFitScore: number | null;
  topScored: Array<{ id: string; title: string; company: string; fitScore: number }>;

  // Recommendations
  applyCount: number;         // jobs with recommendation = 'apply'
  skipCount: number;
  reachOutCount: number;

  // Discovery
  discoveredToday: number;
  discoveredThisWeek: number;

  // Pipeline health
  withCoverLetter: number;
  applied: number;
  interviews: number;
  offers: number;

  // Domain coverage (for company research)
  withDomain: number;
  withoutDomain: number;
  researched: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb();

    // Total count
    const totalRow = await db`SELECT COUNT(*) as count FROM jobs`;
    const total = parseInt(totalRow[0].count as string, 10);

    // By status
    const statusRows = await db`SELECT status, COUNT(*) as count FROM jobs GROUP BY status`;
    const byStatus: Record<string, number> = {};
    for (const row of statusRows) byStatus[row.status as string] = parseInt(row.count as string, 10);

    const scoredRow = await db`SELECT COUNT(*) as count FROM jobs WHERE fit_score IS NOT NULL`;
    const scored = parseInt(scoredRow[0].count as string, 10);

    const avgRow = await db`SELECT AVG(fit_score) as avg FROM jobs WHERE fit_score IS NOT NULL`;
    const avgFitScore = avgRow[0].avg !== null ? Math.round(parseFloat(avgRow[0].avg as string)) : null;

    // Top 5 scored jobs
    const topRows = await db`
      SELECT id, title, company, fit_score
      FROM jobs
      WHERE fit_score IS NOT NULL
      ORDER BY fit_score DESC
      LIMIT 5
    `;
    const topScored = topRows.map(r => ({
      id: r.id as string, title: r.title as string, company: r.company as string, fitScore: r.fit_score as number,
    }));

    // Apply recommendations
    const applyRow = await db`SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'apply'`;
    const skipRow = await db`SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'skip'`;
    const reachRow = await db`SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'reach_out_first'`;

    // Discovery time buckets
    const todayRow = await db`SELECT COUNT(*) as count FROM jobs WHERE DATE(discovered_at) = CURRENT_DATE`;
    const weekRow = await db`SELECT COUNT(*) as count FROM jobs WHERE discovered_at >= NOW() - INTERVAL '7 days'`;

    // Pipeline milestones
    const clRow = await db`SELECT COUNT(*) as count FROM jobs WHERE cover_letter IS NOT NULL AND cover_letter != ''`;
    const appliedRow = await db`SELECT COUNT(*) as count FROM jobs WHERE status IN ('applied', 'viewed', 'interview', 'offer')`;
    const interviewRow = await db`SELECT COUNT(*) as count FROM jobs WHERE status = 'interview'`;
    const offerRow = await db`SELECT COUNT(*) as count FROM jobs WHERE status = 'offer'`;

    // Domain coverage
    const domainRow = await db`SELECT COUNT(*) as count FROM jobs WHERE company_domain IS NOT NULL AND company_domain != ''`;
    const researchedRow = await db`SELECT COUNT(*) as count FROM jobs WHERE researched_at IS NOT NULL`;

    const stats: DashboardStats = {
      total,
      byStatus,
      scored,
      avgFitScore,
      topScored,
      applyCount: parseInt(applyRow[0].count as string, 10),
      skipCount: parseInt(skipRow[0].count as string, 10),
      reachOutCount: parseInt(reachRow[0].count as string, 10),
      discoveredToday: parseInt(todayRow[0].count as string, 10),
      discoveredThisWeek: parseInt(weekRow[0].count as string, 10),
      withCoverLetter: parseInt(clRow[0].count as string, 10),
      applied: parseInt(appliedRow[0].count as string, 10),
      interviews: parseInt(interviewRow[0].count as string, 10),
      offers: parseInt(offerRow[0].count as string, 10),
      withDomain: parseInt(domainRow[0].count as string, 10),
      withoutDomain: total - parseInt(domainRow[0].count as string, 10),
      researched: parseInt(researchedRow[0].count as string, 10),
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
