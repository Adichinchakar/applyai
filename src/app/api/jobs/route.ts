import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = limit > 0 ? (page - 1) * limit : 0;
    const format = searchParams.get('format');

    if (format === 'csv') {
      const allRows = db.prepare('SELECT * FROM jobs ORDER BY discovered_at DESC').all();
      const allJobs = allRows.map(row => rowToJob(row as Record<string, unknown>));

      const csvHeader = 'Title,Company,Status,Fit Score,Recommendation,URL,Discovered At,Applied At\n';
      const csvRows = allJobs.filter((job): job is NonNullable<typeof job> => job !== null).map(job => {
        const escapeCsv = (str: string | undefined | null) =>
          str ? `"${String(str).replace(/"/g, '""')}"` : '';

        return [
          escapeCsv(job.title),
          escapeCsv(job.company),
          escapeCsv(job.status),
          job.fitScore ?? '',
          escapeCsv(job.applyRecommendation),
          escapeCsv(job.jobUrl),
          escapeCsv(job.discoveredAt),
          escapeCsv(job.appliedAt)
        ].join(',');
      }).join('\n');

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="jobs_export.csv"'
        }
      });
    }

    let rows;
    let totalRow;

    if (status) {
      if (limit > 0) {
        rows = db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY discovered_at DESC LIMIT ? OFFSET ?').all(status, limit, offset);
      } else {
        rows = db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY discovered_at DESC').all(status);
      }
      totalRow = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get(status) as { count: number };
    } else {
      if (limit > 0) {
        rows = db.prepare('SELECT * FROM jobs ORDER BY discovered_at DESC LIMIT ? OFFSET ?').all(limit, offset);
      } else {
        rows = db.prepare('SELECT * FROM jobs ORDER BY discovered_at DESC').all();
      }
      totalRow = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
    }

    const total = totalRow.count;
    const jobs = rows.map(row => rowToJob(row as Record<string, unknown>));

    return NextResponse.json({ jobs, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Build UPDATE query dynamically
    const allowedFields: Record<string, string> = {
      status: 'status',
      notes: 'notes',
      coverLetter: 'cover_letter',
      followUpAt: 'follow_up_at',
    };

    const setClauses: string[] = [];
    const values: (string | number | null | bigint | Uint8Array)[] = [];

    for (const [key, dbCol] of Object.entries(allowedFields)) {
      if (key in updates) {
        setClauses.push(`${dbCol} = ?`);
        values.push(updates[key] as string | number | null);
      }
    }

    if (!setClauses.length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    return NextResponse.json({ job: rowToJob(updated as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete job' },
      { status: 500 }
    );
  }
}
