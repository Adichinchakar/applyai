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
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
    const total = totalRow.count;

    // By status
    const statusRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM jobs GROUP BY status'
    ).all() as Array<{ status: string; count: number }>;
    const byStatus: Record<string, number> = {};
    for (const row of statusRows) byStatus[row.status] = row.count;

    // Scoring stats
    const scoredRow = db.prepare(
      'SELECT COUNT(*) as count FROM jobs WHERE fit_score IS NOT NULL'
    ).get() as { count: number };
    const scored = scoredRow.count;

    const avgRow = db.prepare(
      'SELECT AVG(fit_score) as avg FROM jobs WHERE fit_score IS NOT NULL'
    ).get() as { avg: number | null };
    const avgFitScore = avgRow.avg !== null ? Math.round(avgRow.avg) : null;

    // Top 5 scored jobs
    const topRows = db.prepare(`
      SELECT id, title, company, fit_score
      FROM jobs
      WHERE fit_score IS NOT NULL
      ORDER BY fit_score DESC
      LIMIT 5
    `).all() as Array<{ id: string; title: string; company: string; fit_score: number }>;
    const topScored = topRows.map(r => ({
      id: r.id, title: r.title, company: r.company, fitScore: r.fit_score,
    }));

    // Apply recommendations
    const applyRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'apply'"
    ).get() as { count: number };
    const skipRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'skip'"
    ).get() as { count: number };
    const reachRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE apply_recommendation = 'reach_out_first'"
    ).get() as { count: number };

    // Discovery time buckets
    const todayRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE date(discovered_at) = date('now')"
    ).get() as { count: number };
    const weekRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE discovered_at >= datetime('now', '-7 days')"
    ).get() as { count: number };

    // Pipeline milestones
    const clRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE cover_letter IS NOT NULL AND cover_letter != ''"
    ).get() as { count: number };
    const appliedRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE status IN ('applied', 'viewed', 'interview', 'offer')"
    ).get() as { count: number };
    const interviewRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE status = 'interview'"
    ).get() as { count: number };
    const offerRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE status = 'offer'"
    ).get() as { count: number };

    // Domain coverage
    const domainRow = db.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE company_domain IS NOT NULL AND company_domain != ''"
    ).get() as { count: number };
    const researchedRow = db.prepare(
      'SELECT COUNT(*) as count FROM jobs WHERE researched_at IS NOT NULL'
    ).get() as { count: number };

    const stats: DashboardStats = {
      total,
      byStatus,
      scored,
      avgFitScore,
      topScored,
      applyCount: applyRow.count,
      skipCount: skipRow.count,
      reachOutCount: reachRow.count,
      discoveredToday: todayRow.count,
      discoveredThisWeek: weekRow.count,
      withCoverLetter: clRow.count,
      applied: appliedRow.count,
      interviews: interviewRow.count,
      offers: offerRow.count,
      withDomain: domainRow.count,
      withoutDomain: total - domainRow.count,
      researched: researchedRow.count,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
