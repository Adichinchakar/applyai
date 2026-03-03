'use client';

interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
}

export function LoadingState({ message = 'Loading...', type = 'spinner' }: LoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-24 rounded-xl animate-pulse"
            style={{ backgroundColor: '#1A1A24' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }}
      />
      <p className="text-sm" style={{ color: '#A1A1AA' }}>{message}</p>
    </div>
  );
}
