import { NextRequest, NextResponse } from 'next/server';
import { getDb, rowToJob } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db`SELECT * FROM jobs WHERE id = ${id}`;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const logs = await db`SELECT * FROM application_log WHERE job_id = ${id} ORDER BY created_at ASC`;

    return NextResponse.json({ job: rowToJob(rows[0] as Record<string, unknown>), logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job' },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    const db = getDb();
    await db`UPDATE jobs SET status = ${status} WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
