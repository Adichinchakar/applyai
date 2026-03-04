/**
 * POST /api/admin/cleanup-jobs
 *
 * Deletes all jobs whose titles are clearly NOT UX/Product/Design roles.
 * Safe to run multiple times (idempotent). Returns counts of deleted + kept rows.
 *
 * Call it once from the browser after deploying:
 *   fetch('/api/admin/cleanup-jobs', { method: 'POST' }).then(r => r.json()).then(console.log)
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Title must contain at least one of these (case-insensitive) to be KEPT
const KEEP_KEYWORDS = [
  'design',
  'designer',
  'ux',
  'ui',
  'product design',
  'interaction',
  'visual design',
  'brand design',
  'design system',
  'design manager',
  'design lead',
  'design director',
  'founding designer',
  'staff designer',
  'principal designer',
  'design program',
  'design ops',
  'design research',
  'product manager',   // Aditya is open to PM roles too
  'program manager',   // keep if explicitly design-adjacent (scored later)
];

function titleIsDesignRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return KEEP_KEYWORDS.some(kw => lower.includes(kw));
}

export async function POST(): Promise<NextResponse> {
  try {
    const db = getDb();

    // Fetch all job ids + titles
    const rows = await db`SELECT id, title FROM jobs`;

    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const row of rows) {
      const title = typeof row.title === 'string' ? row.title : '';
      if (titleIsDesignRelated(title)) {
        toKeep.push(title);
      } else {
        toDelete.push(row.id as string);
      }
    }

    // Delete in one query using ANY
    let deleted = 0;
    if (toDelete.length > 0) {
      await db`DELETE FROM jobs WHERE id = ANY(${toDelete}::text[])`;
      deleted = toDelete.length;
    }

    return NextResponse.json({
      success: true,
      deleted,
      kept: toKeep.length,
      keptTitles: toKeep,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
