'use client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: '#111118',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: '#F4F4F5' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: '#A1A1AA' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
