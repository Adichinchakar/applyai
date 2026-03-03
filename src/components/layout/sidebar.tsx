'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  Zap,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/jobs', icon: Briefcase, label: 'All Jobs' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-16 lg:w-56 h-screen border-r flex-shrink-0"
      style={{
        backgroundColor: '#111118',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#6366F1' }}
        >
          <Zap size={16} className="text-white" />
        </div>
        <span className="hidden lg:block font-bold text-sm tracking-wide" style={{ color: '#F4F4F5' }}>
          ApplyAI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? '#6366F1' : '#A1A1AA',
              }}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:block text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="p-4 border-t hidden lg:block"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: '#10B981' }} />
          <span className="text-xs" style={{ color: '#A1A1AA' }}>
            Powered by Claude
          </span>
        </div>
      </div>
    </aside>
  );
}
