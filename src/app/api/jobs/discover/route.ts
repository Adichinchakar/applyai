import { NextResponse } from 'next/server';
import { runDiscovery } from '@/lib/discovery';

export async function POST() {
  try {
    const result = await runDiscovery();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}
