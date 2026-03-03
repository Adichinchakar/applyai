import { ApplicationStatus } from '@/types';

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string; pulse?: boolean }> = {
  discovered: { label: 'Discovered', bg: 'rgba(113,113,122,0.2)', text: '#71717A' },
  scored: { label: 'Scored', bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  queued: { label: 'Queued', bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
  cover_letter_ready: { label: 'CL Ready', bg: 'rgba(99,102,241,0.15)', text: '#6366F1' },
  applying: { label: 'Applying', bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', pulse: true },
  applied: { label: 'Applied', bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
  viewed: { label: 'Viewed', bg: 'rgba(20,184,166,0.15)', text: '#14B8A6' },
  interview: { label: 'Interview', bg: 'rgba(99,102,241,0.15)', text: '#6366F1' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.1)', text: '#6B7280' },
  offer: { label: 'Offer!', bg: 'rgba(234,179,8,0.15)', text: '#EAB308' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.discovered;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.pulse ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
