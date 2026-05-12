// frontend/app/status/page.tsx — evaluator-visible pipeline observability page
import Link from 'next/link';
import { getRecentRuns, getArticleCount } from '@/lib/status';
import type { PipelineRun } from '@/lib/status';
import PipelineTrigger from './PipelineTrigger';
import PipelineLogs from './PipelineLogs';

export const revalidate = 60;

export const metadata = {
  title: "System Status — Divyani's AI Newsroom",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function fmtDuration(s: number | null) {
  if (s == null) return '—';
  return s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)}m`;
}

function StatusBadge({ status }: { status: PipelineRun['status'] }) {
  const map: Record<string, { cls: string; label: string }> = {
    success: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: '✓ OK' },
    error:   { cls: 'bg-red-500/15 text-red-400 border-red-500/20',             label: '✗ Error' },
    running: { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',    label: '⟳ Running' },
  };
  const { cls, label } = map[status] ?? map.running;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default async function StatusPage() {
  const [runs, articleCount] = await Promise.all([getRecentRuns(10), getArticleCount()]);

  const lastRun   = runs[0] ?? null;
  const isHealthy = !lastRun || lastRun.status !== 'error';
  const lastError = runs.find(r => r.error_message);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Header */}
      <div className="border-b border-white/[0.08] bg-black/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              ← Back to newsroom
            </Link>
            <h1 className="mt-1 text-xl font-bold text-white tracking-tight">System Status</h1>
            <p className="text-xs text-white/30 mt-0.5">Pipeline run history · Infrastructure health</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
            isHealthy
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`text-sm font-medium ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
              {isHealthy ? 'Operational' : 'Degraded'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Articles', value: articleCount.toLocaleString() },
            { label: 'Schedule',       value: 'Every 6 h' },
            { label: 'Last Run',       value: lastRun ? fmtDate(lastRun.started_at) : 'None yet' },
            { label: 'OpenClaw',       value: lastRun?.openclaw_used ? 'Active' : lastRun ? 'Disabled' : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[11px] text-white/40 mb-1">{label}</p>
              <p className="text-sm font-semibold text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        <PipelineTrigger />

        {/* Run history table */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Pipeline Run History</h2>
            <p className="text-xs text-white/30 mt-0.5">
              Autonomous runs via systemd timer on AWS EC2 · OpenClaw multi-agent runtime
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Time (UTC)', 'Status', 'Fetched', 'Saved', 'Duration', 'OpenClaw'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-white/30">
                      No runs recorded yet — pipeline runs at 00:00, 06:00, 12:00, 18:00 UTC
                    </td>
                  </tr>
                ) : runs.map(run => (
                  <tr
                    key={run.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtDate(run.started_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-4 py-3 text-white/60">{run.articles_fetched ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60">{run.articles_saved ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60">{fmtDuration(run.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      {run.openclaw_used
                        ? <span className="text-violet-400 font-medium">✓ Active</span>
                        : <span className="text-white/25">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastError && (
            <div className="px-5 py-4 border-t border-red-500/10 bg-red-500/5">
              <p className="text-xs font-medium text-red-400 mb-1">Last error</p>
              <code className="text-xs text-white/50 break-all">{lastError.error_message}</code>
            </div>
          )}
        </div>

        {/* Infrastructure */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Infrastructure</h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 sm:grid-cols-3">
            {[
              { label: 'VPS',           value: 'AWS EC2 t3.micro (free tier)' },
              { label: 'Scheduler',     value: 'systemd timer (00/06/12/18 UTC)' },
              { label: 'Agent Runtime', value: 'OpenClaw (gateway port 18789)' },
              { label: 'LLM',           value: 'Ollama Cloud · ministral-3:3b' },
              { label: 'Database',      value: 'Supabase (free tier)' },
              { label: 'Monthly Cost',  value: '$0.00' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-white/30 mb-0.5">{label}</p>
                <p className="text-xs text-white/70 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <PipelineLogs />

      </div>
    </div>
  );
}
