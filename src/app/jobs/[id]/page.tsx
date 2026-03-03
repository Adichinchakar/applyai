'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import { Job } from '@/types';
import { JobDetail } from '@/components/jobs/job-detail';
import { Header } from '@/components/layout/header';
import { LoadingState } from '@/components/ui/loading-state';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface LogEntry {
  id: number;
  event: string;
  details: string;
  created_at: string;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      setJob(data.job);
      setLogs(data.logs || []);
    } catch {
      console.error('Failed to fetch job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  if (loading) return <LoadingState message="Loading job..." />;
  if (!job) return (
    <div className="flex flex-col items-center justify-center h-full">
      <p style={{ color: '#A1A1AA' }}>Job not found</p>
      <Link href="/jobs" className="mt-4 text-sm" style={{ color: '#6366F1' }}>
        Back to jobs
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title={job.title}
        subtitle={job.company}
        actions={
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A1A1AA' }}
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        }
      />
      <div className="flex-1 overflow-auto">
        <JobDetail job={job} logs={logs} onRefresh={fetchJob} />
      </div>
    </div>
  );
}
