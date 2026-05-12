'use client';
import { useEffect, useState } from 'react';

export default function PipelineLogs() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/pipeline-logs');
        if (res.ok) {
          const data: { lines: string[] } = await res.json();
          setLines(data.lines ?? []);
        }
      } catch {
        // keep stale data on transient errors
      }
    }

    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white">Recent Runtime Logs</h2>
        <p className="text-xs text-white/30 mt-0.5">Auto-refreshes every 5 seconds</p>
      </div>
      <div className="bg-black/40 font-mono text-xs text-green-400/80 p-4 max-h-72 overflow-y-auto">
        {lines.length === 0 ? (
          <span className="text-white/30">No logs available.</span>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}
