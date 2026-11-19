import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubCrest } from '@/components/common/ClubCrest';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/lords-cup', label: 'Lords Cup' },
  { to: '/lords-cup/history', label: 'History' },
  { to: '/fixtures', label: 'Fixtures' },
  { to: '/hall-of-fame', label: 'Hall of Fame' },
  { to: '/players', label: 'Players' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/community', label: 'Community' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: org } = useOrganization();
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-gold/40 bg-forest text-cream shadow-sm">
      {/* Top Heritage Strip */}
      <div className="border-b border-gold/20 bg-charcoal px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-cream/80">
        <div className="container flex items-center justify-between px-0">
          <span>
            {org?.institution ?? 'East West University'} · {org?.city_country ?? 'Dhaka, Bangladesh'}
          </span>
          <span className="hidden font-semibold text-gold sm:inline">
            {org?.tagline ?? 'KICK · MISS · REPEAT'}
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <ClubCrest logoUrl={org?.logo_url} orgName={org?.organization_name} size="sm" />
          <div className="leading-none">
            <span className="block font-serif text-lg font-bold tracking-tight text-cream">
              {org?.organization_name ?? 'Lords of EWU'}
            </span>
            <span className="block font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-gold">
              {org?.tagline ?? 'KICK · MISS · REPEAT'}
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap px-2.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                  isActive
                    ? 'text-gold underline decoration-gold underline-offset-8'
                    : 'text-cream/85 hover:text-gold'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 xl:flex">
          <Button variant="outlineLight" size="sm" asChild>
            <Link to="/registration-status">Check Status</Link>
          </Button>
          <Button variant="gold" size="sm" asChild>
            <Link to="/join-us">Join Us</Link>
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" className="text-gold hover:bg-forest-700" asChild>
              <Link to="/admin" aria-label="Admin Dashboard" title="Admin Dashboard">
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-gold/30 text-cream xl:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto border-t border-gold/25 bg-forest-800 xl:hidden">
          <nav className="container flex flex-col gap-1 py-4" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-sm px-3 py-2.5 text-sm font-semibold uppercase tracking-wider',
                    isActive ? 'bg-forest text-gold' : 'text-cream/90 hover:bg-forest/60'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gold/20 pt-3">
              <Button variant="outlineLight" size="sm" asChild onClick={() => setOpen(false)}>
                <Link to="/registration-status">Check Status</Link>
              </Button>
              <Button variant="gold" size="sm" asChild onClick={() => setOpen(false)}>
                <Link to="/join-us">Join Us</Link>
              </Button>
            </div>
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-gold/90"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Portal
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
