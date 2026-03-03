import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!row) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const logs = db.prepare(
      'SELECT * FROM application_log WHERE job_id = ? ORDER BY created_at ASC'
    ).all(id);

    return NextResponse.json({ job: rowToJob(row as Record<string, unknown>), logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
