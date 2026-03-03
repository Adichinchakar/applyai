'use client';

import { useState, useEffect, useCallback } from 'react';
import { Job } from '@/types';
import { PipelineBoard } from '@/components/dashboard/pipeline-board';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { Header } from '@/components/layout/header';
import { LoadingState } from '@/components/ui/loading-state';
import { RefreshCw, Search, Trophy, Target, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, isBefore, subDays } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DashboardStats } from '@/app/api/stats/route';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [scoringProgress, setScoringProgress] = useState<{
    status: 'idle' | 'scoring' | 'done',
    message: string,
    progress: number,
    details?: string
  }>({ status: 'idle', message: '', progress: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/jobs?limit=-1'),
        fetch('/api/stats')
      ]);
      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();
      setJobs(jobsData.jobs || []);
      setStats(statsData);
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDiscover = async () => {
    setDiscovering(true);
    const loadingToast = toast.loading('Discovering jobs...');
    try {
      const res = await fetch('/api/jobs/discover', { method: 'POST' });
      if (!res.ok) throw new Error('Discovery failed');
      const data = await res.json();
      toast.success(`Found ${data.newJobs} new jobs (${data.duplicates} duplicates)`, { id: loadingToast });
      await fetchData();
    } catch {
      toast.error('Discovery failed', { id: loadingToast });
    } finally {
      setDiscovering(false);
    }
  };

  const handleScoreAll = async () => {
    setScoringProgress({ status: 'scoring', message: 'Starting batch scoring...', progress: 0 });
    try {
      const response = await fetch('/api/jobs/score-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 25 })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());

              if (data.type === 'progress') {
                const percent = Math.round((data.index / data.total) * 100);
                const rec = data.recommendation ? `${data.score}/100 ✅ ${data.recommendation}` : '';

                setScoringProgress({
                  status: 'scoring',
                  progress: percent,
                  message: `Scoring ${data.index}/${data.total}: ${data.company} — ${data.title}`,
                  details: rec
                });
              } else if (data.type === 'done') {
                setScoringProgress({
                  status: 'done',
                  progress: 100,
                  message: `Scored ${data.scored} jobs. ${data.apply || 0} ready to apply, ${data.skip || 0} skip, ${data.reachOut || 0} reach out`,
                  details: `Failed: ${data.failed}. Refreshing dashboard...`
                });
                await fetchData();
                setTimeout(() => setScoringProgress({ status: 'idle', message: '', progress: 0 }), 6000);
              } else if (data.type === 'error') {
                toast.error(`Error scoring ${data.title}: ${data.error}`);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (e) {
      toast.error('Failed to start batch scoring');
      setScoringProgress({ status: 'idle', message: '', progress: 0 });
    }
  };

  const weekAgo = subDays(new Date(), 7);
  const followUpJobs = jobs.filter(j =>
    j.status === 'applied' && j.appliedAt && isBefore(new Date(j.appliedAt), weekAgo)
  ).sort((a, b) => new Date(a.appliedAt!).getTime() - new Date(b.appliedAt!).getTime());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Pipeline"
        subtitle={stats ? `${stats.total} jobs tracked` : 'Loading...'}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleScoreAll}
              disabled={scoringProgress.status === 'scoring' || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: 'white' }}
            >
              <Target size={14} className={scoringProgress.status === 'scoring' ? 'animate-pulse' : ''} />
              {scoringProgress.status === 'scoring' ? 'Scoring...' : 'Score All'}
            </button>
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: '#6366F1', color: 'white' }}
            >
              <Search size={14} className={discovering ? 'animate-spin' : ''} />
              {discovering ? 'Discovering...' : 'Discover Jobs'}
            </button>
            <button
              onClick={fetchData}
              className="p-2 rounded-xl transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A1A1AA' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        }
      />

      {scoringProgress.status !== 'idle' && (
        <div className="mx-6 mt-6 p-4 rounded-xl border flex flex-col gap-3" style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-200">{scoringProgress.message}</span>
              {scoringProgress.details && <span className="text-xs text-zinc-400">{scoringProgress.details}</span>}
            </div>
            <span className="text-sm font-bold" style={{ color: '#10B981' }}>{scoringProgress.progress}%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${scoringProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading || !stats ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
            <div className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
            <LoadingState message="Loading pipeline..." />
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-6">
            <StatsBar stats={stats} />

            {followUpJobs.length > 0 && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-orange-500" />
                  <h3 className="font-semibold text-sm text-zinc-200">⏰ {followUpJobs.length} application{followUpJobs.length === 1 ? '' : 's'} need{followUpJobs.length === 1 ? 's' : ''} follow-up</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followUpJobs.map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-medium text-zinc-200 truncate">{job.company}</span>
                        <span className="text-xs text-zinc-400 truncate">{job.title}</span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[10px] text-orange-400 mb-1">
                          Applied {formatDistanceToNow(new Date(job.appliedAt!))} ago
                        </span>
                        <ExternalLink size={12} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {stats.topScored.length > 0 && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-yellow-500" />
                  <h3 className="font-semibold text-sm text-zinc-200">Top 5 Scored Jobs</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {stats.topScored.map((job) => (
                    <div key={job.id} className="rounded-lg p-3 bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="text-zinc-400 text-xs mb-1 truncate" title={job.company}>{job.company}</div>
                        <div className="text-zinc-200 text-sm font-medium line-clamp-2 leading-tight mb-3" title={job.title}>{job.title}</div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-zinc-500">Fit score</span>
                          <span className="text-sm font-bold text-green-400">{job.fitScore}/100</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${job.fitScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PipelineBoard jobs={jobs} onRefresh={fetchData} />
          </div>
        )}
      </div>
    </div>
  );
}
