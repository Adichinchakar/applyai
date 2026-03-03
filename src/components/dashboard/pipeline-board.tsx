'use client';

import { Job, ApplicationStatus } from '@/types';
import { JobCard } from './job-card';
import { motion } from 'framer-motion';

interface PipelineBoardProps {
  jobs: Job[];
  onRefresh: () => void;
}

const COLUMNS: { status: ApplicationStatus | ApplicationStatus[]; label: string; color: string }[] = [
  { status: 'discovered', label: 'Discovered', color: '#71717A' },
  { status: 'scored', label: 'Scored', color: '#3B82F6' },
  { status: 'queued', label: 'Queued', color: '#8B5CF6' },
  { status: 'applying', label: 'Applying', color: '#F59E0B' },
  { status: 'applied', label: 'Applied', color: '#10B981' },
  { status: ['interview', 'offer', 'rejected'], label: 'Tracking', color: '#6366F1' },
];

export function PipelineBoard({ jobs, onRefresh }: PipelineBoardProps) {
  const getColumnJobs = (status: ApplicationStatus | ApplicationStatus[]) => {
    if (Array.isArray(status)) {
      return jobs.filter(j => status.includes(j.status));
    }
    return jobs.filter(j => j.status === status);
  };

  return (
    <div className="flex gap-4 p-6 overflow-x-auto min-h-0 pb-6">
      {COLUMNS.map(({ status, label, color }) => {
        const columnJobs = getColumnJobs(status);
        return (
          <div
            key={Array.isArray(status) ? status.join(',') : status}
            className="flex-shrink-0 w-72 flex flex-col"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium" style={{ color: '#F4F4F5' }}>
                {label}
              </span>
              <span
                className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#A1A1AA' }}
              >
                {columnJobs.length}
              </span>
            </div>

            {/* Column body */}
            <div
              className="flex-1 rounded-xl p-2 space-y-2 min-h-32 overflow-y-auto"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              {columnJobs.length === 0 ? (
                <div className="flex items-center justify-center h-24">
                  <p className="text-xs" style={{ color: '#52525B' }}>Empty</p>
                </div>
              ) : (
                columnJobs.map(job => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <JobCard job={job} onStatusChange={onRefresh} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
