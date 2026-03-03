'use client';

import Link from 'next/link';
import { Job } from '@/types';
import { ScoreBadge } from '@/components/ui/score-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapPin, ExternalLink } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onStatusChange?: (id: string, status: string) => void;
}

export function JobCard({ job, onStatusChange }: JobCardProps) {
  const domain = job.companyDomain;
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

  const topGreenFlag = job.greenFlags?.[0];

  const getSourceBadge = (url?: string) => {
    if (!url) return null;
    if (url.includes('remoteok.com')) return 'RemoteOK';
    if (url.includes('weworkremotely.com')) return 'WWR';
    if (url.includes('indeed.com')) return 'Indeed';
    if (url.includes('wellfound.com')) return 'Wellfound';
    return null;
  };

  const sourceName = getSourceBadge(job.jobUrl);

  return (
    <Link href={`/jobs/${job.id}`}>
      <div
        className="rounded-xl p-4 border cursor-pointer transition-all duration-150 hover:border-indigo-500/30 group"
        style={{
          backgroundColor: '#1A1A24',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="w-6 h-6 rounded flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#F4F4F5' }}>
                {job.title}
              </p>
              <p className="text-xs truncate" style={{ color: '#A1A1AA' }}>
                {job.company}
              </p>
            </div>
          </div>
          {job.fitScore !== undefined && (
            <ScoreBadge score={job.fitScore} size="sm" />
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge status={job.status} />
          {sourceName && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#D4D4D8' }}>
              {sourceName}
            </span>
          )}
          {job.location && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#A1A1AA' }}>
              <MapPin size={10} />
              {job.remoteType === 'remote' ? 'Remote' : job.location}
            </span>
          )}
        </div>

        {/* Green flag preview */}
        {topGreenFlag && (
          <p
            className="text-xs line-clamp-2 mb-3 px-2 py-1 rounded"
            style={{
              backgroundColor: 'rgba(16,185,129,0.08)',
              color: '#10B981',
              borderLeft: '2px solid #10B981',
            }}
          >
            {topGreenFlag}
          </p>
        )}

        {/* Salary */}
        {(job.salaryMin || job.salaryMax) && (
          <p className="text-xs" style={{ color: '#A1A1AA' }}>
            ${job.salaryMin ? `${(job.salaryMin / 1000).toFixed(0)}K` : '?'}
            {job.salaryMax ? ` – $${(job.salaryMax / 1000).toFixed(0)}K` : '+'}
          </p>
        )}
      </div>
    </Link>
  );
}
