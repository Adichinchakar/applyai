'use client';

import { Job } from '@/types';
import { FitScoreCard } from './fit-score-card';
import { CoverLetterEditor } from './cover-letter-editor';
import { ApplyButton } from './apply-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Building2, Calendar, ExternalLink, Zap, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface JobDetailProps {
  job: Job;
  logs?: Array<{ id: number; event: string; details: string; created_at: string }>;
  onRefresh?: () => void;
}

export function JobDetail({ job, logs = [], onRefresh }: JobDetailProps) {
  const [scoring, setScoring] = useState(false);
  const [researching, setResearching] = useState(false);

  const handleScore = async () => {
    setScoring(true);
    try {
      const res = await fetch('/api/jobs/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error('Scoring failed');
      toast.success('Scoring complete');
      onRefresh?.();
    } catch (error) {
      toast.error('Scoring failed — check API key');
    } finally {
      setScoring(false);
    }
  };

  const handleResearch = async () => {
    setResearching(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error('Research failed');
      toast.success('Research complete');
      onRefresh?.();
    } catch (error) {
      toast.error('Research failed');
    } finally {
      setResearching(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-0">
      {/* Left: JD + Scores */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Job header */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#F4F4F5' }}>{job.title}</h1>
              <p className="text-base font-medium" style={{ color: '#A1A1AA' }}>{job.company}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <div className="flex flex-wrap gap-3 text-sm mb-4">
            {job.location && (
              <span className="flex items-center gap-1" style={{ color: '#A1A1AA' }}>
                <Globe size={12} /> {job.location}
              </span>
            )}
            {job.companySize && (
              <span className="flex items-center gap-1" style={{ color: '#A1A1AA' }}>
                <Building2 size={12} /> {job.companySize}
              </span>
            )}
            {job.discoveredAt && (
              <span className="flex items-center gap-1" style={{ color: '#A1A1AA' }}>
                <Calendar size={12} /> {format(new Date(job.discoveredAt), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleScore}
              disabled={scoring}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366F1' }}
            >
              <Zap size={12} className={scoring ? 'animate-spin' : ''} />
              {scoring ? 'Scoring...' : job.fitScore ? 'Re-score' : 'Score Fit'}
            </button>
            <button
              onClick={handleResearch}
              disabled={researching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}
            >
              <Building2 size={12} className={researching ? 'animate-spin' : ''} />
              {researching ? 'Researching...' : job.companySummary ? 'Re-research' : 'Research Co.'}
            </button>
          </div>
        </div>

        {/* Fit Score Card */}
        <FitScoreCard job={job} />

        {/* Company Research */}
        {job.companySummary && (
          <div
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Company Intel</h3>
            <p className="text-sm" style={{ color: '#A1A1AA' }}>{job.companySummary}</p>
            <div className="flex gap-2">
              {job.companySize && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}
                >
                  {job.companySize}
                </span>
              )}
              {job.fundingStage && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#8B5CF6' }}
                >
                  {job.fundingStage}
                </span>
              )}
            </div>
            {job.recentNews && job.recentNews.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium" style={{ color: '#A1A1AA' }}>Recent News</p>
                {job.recentNews.map((news, i) => (
                  <a
                    key={i}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs transition-colors hover:underline"
                    style={{ color: '#6366F1' }}
                  >
                    <ExternalLink size={10} />
                    {news.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Job Description */}
        {job.jdRaw && (
          <div
            className="rounded-xl p-5 border"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#F4F4F5' }}>Job Description</h3>
            <pre
              className="text-xs whitespace-pre-wrap"
              style={{ color: '#A1A1AA', fontFamily: 'inherit', lineHeight: '1.6' }}
            >
              {job.jdRaw.slice(0, 5000)}
              {job.jdRaw.length > 5000 && '...'}
            </pre>
          </div>
        )}
      </div>

      {/* Right: Cover Letter + Apply */}
      <div className="w-full lg:w-96 space-y-4 flex-shrink-0">
        <CoverLetterEditor
          jobId={job.id}
          initialValue={job.coverLetter || ''}
          onUpdate={onRefresh}
        />

        {/* Apply Section */}
        <div
          className="rounded-xl p-5 border space-y-3"
          style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Apply</h3>
          <ApplyButton jobId={job.id} jobUrl={job.jobUrl} onStatusChange={onRefresh} />
        </div>

        {/* Activity Log */}
        {logs.length > 0 && (
          <div
            className="rounded-xl p-5 border space-y-2"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#F4F4F5' }}>Activity</h3>
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: '#6366F1' }}
                />
                <div>
                  <p className="text-xs font-medium" style={{ color: '#F4F4F5' }}>{log.event}</p>
                  {log.details && (
                    <p className="text-xs" style={{ color: '#52525B' }}>{log.details}</p>
                  )}
                  <p className="text-xs" style={{ color: '#3F3F46' }}>
                    {format(new Date(log.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
