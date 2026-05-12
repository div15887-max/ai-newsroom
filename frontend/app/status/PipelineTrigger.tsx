'use client';
import { useState } from 'react';

type TriggerState = 'idle' | 'running' | 'success' | 'error';

const stateLabel: Record<TriggerState, string> = {
  idle:    'Idle',
  running: 'Running...',
  success: 'Success',
  error:   'Error',
};

const stateColor: Record<TriggerState, string> = {
  idle:    'text-white/50',
  running: 'text-yellow-400',
  success: 'text-emerald-400',
  error:   'text-red-400',
};

export default function PipelineTrigger() {
  const [state, setState] = useState<TriggerState>('idle');

  async function handleRun() {
    setState('running');
    try {
      const res = await fetch('/api/run-pipeline', { method: 'POST' });
      setState(res.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Manual Trigger</h2>
        <span className={`text-xs font-medium ${stateColor[state]}`}>
          {stateLabel[state]}
        </span>
      </div>
      <p className="text-xs text-white/30 mb-4">
        Manual trigger interface for OpenClaw-powered newsroom pipeline.
      </p>
      <button
        onClick={handleRun}
        disabled={state === 'running'}
        className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Run Pipeline
      </button>
    </div>
  );
}
