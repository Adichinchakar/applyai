'use client';

import { Job } from '@/types';
import { ScoreBadge } from '@/components/ui/score-badge';
import { CheckCircle2, AlertCircle, Target } from 'lucide-react';

interface FitScoreCardProps {
  job: Job;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function FitScoreCard({ job }: FitScoreCardProps) {
  if (!job.fitScore) {
    return (
      <div
        className="rounded-xl p-4 border"
        style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm" style={{ color: '#A1A1AA' }}>Not yet scored</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 border space-y-4"
      style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Fit Analysis</h3>
        <ScoreBadge score={job.fitScore} size="lg" />
      </div>

      {/* Skills Match */}
      {job.skillsMatch !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: '#A1A1AA' }}>Skills Match</span>
            <span style={{ color: '#F4F4F5' }}>{job.skillsMatch}%</span>
          </div>
          <ProgressBar value={job.skillsMatch} color="#3B82F6" />
        </div>
      )}

      {/* Domain Match */}
      {job.domainMatch !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: '#A1A1AA' }}>Domain Match</span>
            <span style={{ color: '#F4F4F5' }}>{job.domainMatch}%</span>
          </div>
          <ProgressBar value={job.domainMatch} color="#8B5CF6" />
        </div>
      )}

      {/* Seniority */}
      {job.seniorityMatch && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#A1A1AA' }}>Seniority</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{
              backgroundColor: job.seniorityMatch === 'perfect' ? 'rgba(16,185,129,0.15)' :
                               job.seniorityMatch === 'stretch' ? 'rgba(245,158,11,0.15)' :
                               'rgba(99,102,241,0.15)',
              color: job.seniorityMatch === 'perfect' ? '#10B981' :
                     job.seniorityMatch === 'stretch' ? '#F59E0B' : '#6366F1',
            }}
          >
            {job.seniorityMatch}
          </span>
        </div>
      )}

      {/* Green Flags */}
      {job.greenFlags && job.greenFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: '#10B981' }}>
            <CheckCircle2 size={12} className="inline mr-1" />
            Strengths
          </p>
          {job.greenFlags.map((flag, i) => (
            <p key={i} className="text-xs pl-4" style={{ color: '#A1A1AA' }}>• {flag}</p>
          ))}
        </div>
      )}

      {/* Red Flags */}
      {job.redFlags && job.redFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
            <AlertCircle size={12} className="inline mr-1" />
            Concerns
          </p>
          {job.redFlags.map((flag, i) => (
            <p key={i} className="text-xs pl-4" style={{ color: '#A1A1AA' }}>• {flag}</p>
          ))}
        </div>
      )}

      {/* Talking Points */}
      {job.talkingPoints && job.talkingPoints.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: '#6366F1' }}>
            <Target size={12} className="inline mr-1" />
            Talking Points
          </p>
          {job.talkingPoints.map((point, i) => (
            <p key={i} className="text-xs pl-4" style={{ color: '#A1A1AA' }}>• {point}</p>
          ))}
        </div>
      )}
    </div>
  );
}
