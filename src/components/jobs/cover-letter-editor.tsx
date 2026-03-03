'use client';

import { useState } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CoverLetterEditorProps {
  jobId: string;
  initialValue?: string;
  onUpdate?: (value: string) => void;
}

export function CoverLetterEditor({ jobId, initialValue = '', onUpdate }: CoverLetterEditorProps) {
  const [text, setText] = useState(initialValue);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      if (data.coverLetter) {
        setText(data.coverLetter);
        onUpdate?.(data.coverLetter);
        toast.success('Cover letter generated');
      }
    } catch {
      console.error('Failed to generate cover letter');
      toast.error('Generation failed - check API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = async (newValue: string) => {
    setText(newValue);
    // Save to DB on change
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, coverLetter: newValue }),
      });
      onUpdate?.(newValue);
    } catch {
      // Silent fail
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <span className="text-sm font-medium" style={{ color: '#F4F4F5' }}>Cover Letter</span>
        <div className="flex items-center gap-2">
          {text && (
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A1A1AA' }}
            >
              {previewMode ? '✏️ Edit' : '👁 Preview'}
            </button>
          )}
          <span className="text-xs" style={{ color: '#52525B' }}>{text.length} chars</span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A1A1AA' }}
          >
            {copied ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: '#6366F1', color: 'white' }}
          >
            <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Editor */}
      {text ? (
        previewMode ? (
          <div
            className="w-full p-6 overflow-y-auto"
            style={{
              color: '#F4F4F5',
              height: '300px',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              lineHeight: '1.7',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            className="w-full p-4 bg-transparent text-sm outline-none resize-none"
            style={{
              color: '#F4F4F5',
              minHeight: '300px',
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
            placeholder="Click 'Regenerate' to generate a cover letter..."
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm" style={{ color: '#A1A1AA' }}>No cover letter yet</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: '#6366F1', color: 'white' }}
          >
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate Cover Letter'}
          </button>
        </div>
      )}
    </div>
  );
}
