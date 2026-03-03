import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PREFS_PATH = path.join(process.cwd(), 'data', 'preferences.json');

export async function GET() {
  try {
    const prefsContent = fs.readFileSync(PREFS_PATH, 'utf-8');
    const preferences = JSON.parse(prefsContent);

    return NextResponse.json({
      preferences,
      apiKey: process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-4) : '',
    });
  } catch {
    return NextResponse.json({ preferences: null, apiKey: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json();

    if (preferences) {
      fs.writeFileSync(PREFS_PATH, JSON.stringify(preferences, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed' },
      { status: 500 }
    );
  }
}
