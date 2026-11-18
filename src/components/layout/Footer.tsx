import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, ExternalLink } from 'lucide-react';
import { ClubCrest } from '@/components/common/ClubCrest';
import { useOrganization } from '@/hooks/useOrganization';

export function Footer() {
  const { data: org } = useOrganization();
  const socialEntries = Object.entries(org?.social_links ?? {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

  return (
    <footer className="border-t-2 border-gold/60 bg-charcoal text-cream">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3.5">
              <ClubCrest logoUrl={org?.logo_url} orgName={org?.organization_name} size="md" />
              <div>
                <h2 className="font-serif text-xl font-bold text-cream">
                  {org?.organization_name ?? 'Lords of EWU'}
                </h2>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.26em] text-gold">
                  {org?.tagline ?? 'KICK · MISS · REPEAT'}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/75">
              {org?.footer_text ||
                'Lords of EWU — Student-led football community originating at East West University, Dhaka, Bangladesh. Creating Space for Everyone to Play.'}
            </p>
            {org?.philosophy && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gold/90">
                {org.philosophy}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-cream/70">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gold" />
                {org?.institution ?? 'East West University'}, {org?.city_country ?? 'Dhaka, Bangladesh'}
              </span>
              {org?.founding_date && (
                <span className="border-l border-cream/20 pl-4">
                  Est. {org.founding_date}
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
              Club & Tournament
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-cream/80">
              <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
              <li><Link to="/lords-cup" className="hover:text-gold">Lords Cup Portal</Link></li>
              <li><Link to="/lords-cup/history" className="hover:text-gold">Lords Cup History (S1–S8)</Link></li>
              <li><Link to="/fixtures" className="hover:text-gold">Fixtures & Results</Link></li>
              <li><Link to="/players" className="hover:text-gold">Public Player Profiles</Link></li>
              <li><Link to="/hall-of-fame" className="hover:text-gold">Hall of Fame</Link></li>
              <li><Link to="/gallery" className="hover:text-gold">Photo & Video Gallery</Link></li>
              <li><Link to="/register" className="hover:text-gold">Player Registration</Link></li>
              <li><Link to="/registration-status" className="hover:text-gold">Check Registration Status</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
              Connect
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
              {org?.contact_email && (
                <li>
                  <a
                    href={`mailto:${org.contact_email}`}
                    className="inline-flex items-center gap-2 hover:text-gold"
                  >
                    <Mail className="h-4 w-4 text-gold" />
                    {org.contact_email}
                  </a>
                </li>
              )}
              {org?.contact_phone && (
                <li className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gold" />
                  {org.contact_phone}
                </li>
              )}
              {!org?.contact_email && !org?.contact_phone && (
                <li className="text-xs text-cream/55">
                  Official contact channels can be updated via Organization Settings.
                </li>
              )}
            </ul>

            {socialEntries.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-sm border border-gold/30 px-2.5 py-1 text-xs uppercase tracking-wider text-cream/85 hover:border-gold hover:text-gold"
                  >
                    {platform}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}

            <div className="mt-6 border-t border-cream/10 pt-4">
              <Link to="/admin" className="text-xs uppercase tracking-wider text-cream/50 hover:text-gold">
                Organizers & Admin Portal →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-cream/10 pt-6 text-xs text-cream/55 sm:flex-row">
          <p>© {new Date().getFullYear()} {org?.organization_name ?? 'Lords of EWU'}. All rights reserved.</p>
          <p className="font-display tracking-[0.22em] text-gold/80">
            {org?.tagline ?? 'KICK · MISS · REPEAT'}
          </p>
        </div>
      </div>
    </footer>
  );
}
