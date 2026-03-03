'use client';

import { TrendingUp, Briefcase, Send, Target, Search } from 'lucide-react';
import { DashboardStats } from '@/app/api/stats/route';

interface StatsBarProps {
  stats: DashboardStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    {
      icon: Briefcase,
      label: 'Pipeline Health',
      value: `${stats.applied} apps / ${stats.interviews} intvs`,
      subValue: `from ${stats.total} total jobs tracked`,
      color: '#3B82F6',
    },
    {
      icon: Search,
      label: 'Discovery',
      value: `${stats.discoveredToday} today`,
      subValue: `${stats.discoveredThisWeek} this week`,
      color: '#6366F1',
    },
    {
      icon: TrendingUp,
      label: 'Scoring',
      value: `${stats.scored} scored`,
      subValue: stats.avgFitScore ? `Avg score: ${stats.avgFitScore}/100` : 'No scores yet',
      color: '#10B981',
    },
    {
      icon: Target,
      label: 'Actionable',
      value: `${stats.applyCount} ready`,
      subValue: `${stats.reachOutCount} reach out`,
      color: '#F59E0B',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ icon: Icon, label, value, subValue, color }) => (
        <div
          key={label}
          className="rounded-xl p-4 border"
          style={{
            backgroundColor: '#1A1A24',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} style={{ color }} />
            <span className="text-xs" style={{ color: '#A1A1AA' }}>{label}</span>
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: '#F4F4F5' }}>{value}</p>
          <p className="text-xs" style={{ color: '#71717A' }}>{subValue}</p>
        </div>
      ))}
    </div>
  );
}
