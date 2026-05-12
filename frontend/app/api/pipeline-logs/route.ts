import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    exec(
      'journalctl --user -u newsroom-pipeline.service -n 30 --no-pager',
      { timeout: 10000 },
      (err, stdout) => {
        if (err) {
          resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        } else {
          const lines = stdout.split('\n').filter(Boolean);
          resolve(NextResponse.json({ lines }));
        }
      }
    );
  });
}
