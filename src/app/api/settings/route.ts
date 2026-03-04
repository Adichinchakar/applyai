import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db`SELECT value FROM settings WHERE key = 'preferences'`;
    let preferences = null;

    if (rows.length > 0) {
      const raw = rows[0].value;
      try {
        preferences = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        preferences = null;
      }
    }

    return NextResponse.json({
      preferences,
      apiKey: process.env.ANTHROPIC_API_KEY ? '***' + process.env.ANTHROPIC_API_KEY.slice(-4) : '',
    });
  } catch {
    return NextResponse.json({ preferences: null, apiKey: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json();

    if (preferences) {
      const db = getDb();
      await db`
        INSERT INTO settings (key, value)
        VALUES ('preferences', ${preferences as object})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed' },
      { status: 500 }
    );
  }
}
