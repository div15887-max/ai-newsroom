import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = await fetch('http://3.27.155.78:3001/run-pipeline', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer run-newsroom-2026',
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reach VPS control server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
