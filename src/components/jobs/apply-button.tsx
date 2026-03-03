'use client';

import { useState } from 'react';
import { ExternalLink, Play, Send, Loader2 } from 'lucide-react';

interface ApplyEvent {
  event: string;
  data: {
    message?: string;
    screenshot?: string;
    fields?: unknown[];
    [key: string]: unknown;
  };
}

interface ApplyButtonProps {
  jobId: string;
  jobUrl: string;
  onStatusChange?: () => void;
}

export function ApplyButton({ jobId, jobUrl, onStatusChange }: ApplyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'filling' | 'filled' | 'submitting' | 'done' | 'error'>('idle');
  const [events, setEvents] = useState<ApplyEvent[]>([]);
  const [screenshot, setScreenshot] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFillAndPreview = async () => {
    setStatus('filling');
    setEvents([]);
    setScreenshot('');

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as ApplyEvent;
            setEvents(prev => [...prev, parsed]);

            if (parsed.event === 'filled' && parsed.data.screenshot) {
              setScreenshot(parsed.data.screenshot);
              setStatus('filled');
            } else if (parsed.event === 'error') {
              setStatus('error');
              setErrorMsg(parsed.data.message || 'Unknown error');
            } else if (parsed.event === 'captcha_required') {
              setStatus('error');
              setErrorMsg('CAPTCHA detected - please apply manually');
            }
          } catch {
            // Skip parse errors
          }
        }
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply');
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this application? This cannot be undone.')) return;
    setStatus('submitting');
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: 'applied' }),
      });
      setStatus('done');
      onStatusChange?.();
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: '#F4F4F5' }}
        >
          <ExternalLink size={14} />
          Open Listing
        </a>

        {status !== 'done' && (
          <button
            onClick={handleFillAndPreview}
            disabled={status === 'filling'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: '#F59E0B', color: '#0A0A0F' }}
          >
            {status === 'filling' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {status === 'filling' ? 'Filling Form...' : 'Fill & Preview'}
          </button>
        )}

        {status === 'filled' && (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: '#10B981', color: 'white' }}
          >
            <Send size={14} />
            Mark as Applied
          </button>
        )}

        {status === 'done' && (
          <span
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981' }}
          >
            ✓ Applied
          </span>
        )}
      </div>

      {/* Status log */}
      {events.length > 0 && (
        <div
          className="rounded-xl p-3 space-y-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          {events.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: '#A1A1AA' }}>
              <span style={{ color: '#6366F1' }}>[{e.event}]</span>{' '}
              {e.data.message}
            </p>
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div
          className="rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
        >
          <p className="text-xs">{errorMsg}</p>
        </div>
      )}

      {/* Form preview screenshot */}
      {screenshot && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: '#A1A1AA' }}>Form Preview</p>
          <img
            src={screenshot}
            alt="Form preview"
            className="rounded-xl border w-full"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>
      )}
    </div>
  );
}
