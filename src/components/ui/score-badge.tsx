interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): { bg: string; text: string } {
  if (score >= 8) return { bg: 'rgba(16,185,129,0.15)', text: '#10B981' };
  if (score >= 6) return { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' };
  if (score >= 4) return { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' };
  return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' };
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const { bg, text } = getScoreColor(score);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {score}/10
    </span>
  );
}
