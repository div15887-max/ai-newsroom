import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://3.27.155.78:3001/logs', {
      headers: {
        Authorization: 'Bearer run-newsroom-2026',
      },
      cache: 'no-store',
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}