import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Calendar,
  Camera,
  CreditCard,
  FileSpreadsheet,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Shield,
  Shuffle,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClubCrest } from '@/components/common/ClubCrest';
import { useAuth, type AdminPermission } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AdminNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
  end?: boolean;
}

const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/settings', label: 'Organization Settings', icon: Settings, permission: 'manage_settings' },
  { to: '/admin/content', label: 'Website Content (CMS)', icon: FileText, permission: 'manage_cms' },
  { to: '/admin/seasons', label: 'Tournament Seasons', icon: Trophy, permission: 'manage_tournaments' },
  { to: '/admin/registrations', label: 'Registrations', icon: UserCheck, permission: 'manage_registrations' },
  { to: '/admin/payments', label: 'Payment Verification', icon: CreditCard, permission: 'verify_payments' },
  { to: '/admin/members', label: 'Players & Members', icon: Users, permission: 'manage_members' },
  { to: '/admin/teams', label: 'Teams', icon: Shield, permission: 'manage_teams_draw' },
  { to: '/admin/live-draw', label: 'Live Draw', icon: Shuffle, permission: 'manage_teams_draw' },
  { to: '/admin/fixtures', label: 'Fixtures', icon: Calendar, permission: 'manage_matches' },
  { to: '/admin/results', label: 'Match Results', icon: BarChart3, permission: 'manage_matches' },
  { to: '/admin/standings', label: 'Standings', icon: Trophy, permission: 'manage_matches' },
  { to: '/admin/awards', label: 'Awards', icon: Award, permission: 'manage_tournaments' },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, permission: 'manage_announcements' },
  { to: '/admin/gallery', label: 'Gallery', icon: Camera, permission: 'manage_gallery' },
  { to: '/admin/leadership', label: 'Leadership', icon: Users, permission: 'manage_members' },
  { to: '/admin/reports', label: 'Reports & Exports', icon: FileSpreadsheet },
  { to: '/admin/administrators', label: 'Administrators', icon: Shield, permission: 'manage_admins' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
];

export function AdminLayout() {
  const { user, profile, loading, isAdmin, can, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-charcoal-400">
        Verifying administrator session...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // VIEWER can see read-only navigation items across the dashboard
  const isViewer = profile?.role === 'VIEWER';

  const visibleNav = ADMIN_NAV.filter((item) => {
    if (!item.permission) return true;
    if (isViewer) return true;
    return can(item.permission);
  });

  return (
    <div className="flex min-h-screen bg-cream text-charcoal">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gold/30 bg-forest text-cream transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gold/25 px-4">
          <Link to="/admin" className="flex items-center gap-2.5">
            <ClubCrest size="sm" />
            <div>
              <p className="font-serif text-sm font-bold leading-tight">Lords of EWU</p>
              <p className="font-display text-[10px] uppercase tracking-[0.22em] text-gold">
                Control Room
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-cream lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-medium tracking-wide transition-colors',
                    isActive
                      ? 'bg-gold text-charcoal font-bold'
                      : 'text-cream/80 hover:bg-forest-700 hover:text-cream'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gold/25 p-4 space-y-3">
          <div className="text-xs">
            <p className="truncate font-semibold text-cream">{profile?.full_name || profile?.email}</p>
            <Badge variant="gold" className="mt-1 text-[10px]">
              {profile?.role}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outlineLight" size="sm" className="flex-1 text-xs" asChild>
              <Link to="/">Public Site</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-cream hover:bg-forest-700"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-forest/15 bg-cream-50 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-sm border border-forest/20 p-2 text-forest lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-forest">
              Lords of EWU Administration
            </span>
          </div>
          {isViewer && (
            <Badge variant="muted">Read-Only Mode (VIEWER)</Badge>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
