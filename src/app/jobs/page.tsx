'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/types';
import { JobCard } from '@/components/dashboard/job-card';
import { Header } from '@/components/layout/header';
import { LoadingState } from '@/components/ui/loading-state';
import { Search, X, Download } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch('/api/jobs?page=1&limit=25')
      .then(r => r.json())
      .then(d => {
        setJobs(d.jobs || []);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/jobs?page=${nextPage}&limit=25`);
      const data = await res.json();
      setJobs(prev => [...prev, ...(data.jobs || [])]);
      setPage(nextPage);
    } catch {
      console.error('Failed to load more jobs');
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = jobs.filter(job => {
    const matchesSearch = !search ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || job.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statuses = [
    { label: 'All', value: 'all' },
    { label: 'New', value: 'discovered' },
    { label: 'Scored', value: 'scored' },
    { label: 'Interviewing', value: 'interview' },
    { label: 'Applied', value: 'applied' },
    { label: 'Rejected', value: 'rejected' }
  ];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="All Jobs"
        subtitle={`Showing ${filtered.length} of ${jobs.length} jobs`}
        actions={
          <a
            href="/api/jobs?format=csv"
            download="jobs_export.csv"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: '#F4F4F5'
            }}
          >
            <Download size={14} />
            Export CSV
          </a>
        }
      />

      {/* Filters */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border flex-1 max-w-xs"
          style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <Search size={14} style={{ color: '#A1A1AA' }} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1 min-w-[100px]"
            style={{ color: '#F4F4F5' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1 hover:opacity-80 transition-opacity flex-shrink-0">
              <X size={14} style={{ color: '#A1A1AA' }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 hide-scrollbar">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: filter === s.value ? '#6366F1' : 'rgba(255,255,255,0.05)',
                color: filter === s.value ? 'white' : '#A1A1AA',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading jobs..." />
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-lg font-medium mb-2" style={{ color: '#F4F4F5' }}>No jobs found</p>
              <p className="text-sm" style={{ color: '#A1A1AA' }}>
                {search ? 'Try a different search' : 'Run job discovery to get started'}
              </p>
            </div>
          )}

          {jobs.length < total && filtered.length > 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm" style={{ color: '#A1A1AA' }}>
                Showing {jobs.length} of {total} jobs
              </p>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#F4F4F5' }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
