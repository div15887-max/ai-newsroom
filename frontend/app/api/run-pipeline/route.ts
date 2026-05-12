import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    exec(
      'systemctl --user start newsroom-pipeline.service',
      { timeout: 10000 },
      (err) => {
        if (err) {
          resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ ok: true }));
        }
      }
    );
  });
}
