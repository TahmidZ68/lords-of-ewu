import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Camera,
  ExternalLink,
  MapPin,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClubCrest } from '@/components/common/ClubCrest';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { WhyLordsCupDifferent } from '@/components/common/WhyLordsCupDifferent';
import { useOrganization } from '@/hooks/useOrganization';
import {
  useCmsPage,
  usePublishedAnnouncements,
  usePublishedAwards,
  usePublishedGallery,
  usePublishedMatches,
  usePublishedSeasons,
} from '@/hooks/usePublicData';
import {
  mergeWithDocumentedSeasons,
  SEASON_8_REGISTRATION_URL,
} from '@/data/documentedSeasons';
import { FORMAT_LABELS, formatCurrency, formatDate } from '@/lib/utils';

const CORE_VALUES = [
  'Every Player Matters',
  'Every Player Belongs',
  'Every Player Gets A Chance',
  'Inclusive Participation',
  'Sportsmanship',
  'Community Building',
  'Friendship and Competition',
];

export function HomePage() {
  const { data: org } = useOrganization();
  const { data: homePage } = useCmsPage('home');
  const { data: dbSeasons = [] } = usePublishedSeasons('asc');
  const { data: announcements = [] } = usePublishedAnnouncements(3);
  const { data: matches = [] } = usePublishedMatches();
  const { data: awards = [] } = usePublishedAwards();
  const { data: gallery = [] } = usePublishedGallery();

  const heroContent = (homePage?.content ?? {}) as Record<string, string>;
  const timelineSeasons = mergeWithDocumentedSeasons(dbSeasons);
  const activeOpenSeason =
    dbSeasons.find((s) => s.registration_status === 'open') ??
    timelineSeasons[timelineSeasons.length - 1] ??
    null;

  const upcomingMatches = matches
    .filter((m) => m.status === 'scheduled' || m.status === 'live')
    .slice(0, 4);
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .slice(-4)
    .reverse();
  const champions = awards.filter((a) => a.award_type === 'champion');
  const featuredAwards = awards.filter((a) => a.award_type !== 'champion').slice(0, 4);
  const featuredPhotos = gallery.filter((g) => g.media_type === 'image').slice(0, 6);

  const stats = org?.community_stats;
  const facebookUrl = org?.social_links?.facebook?.trim() || '';

  return (
    <>
      <SeoHead
        title="Home"
        description="Lords of EWU — Creating Space for Everyone to Play. Student-led football community originating at East West University, Dhaka, Bangladesh."
      />

      {/* FLOATING ANIMATED NEWS TICKER BAR */}
      <div className="relative overflow-hidden border-b border-gold/40 bg-charcoal py-2.5 text-cream">
        <div className="flex items-center">
          <div className="z-10 flex shrink-0 items-center gap-2 bg-charcoal pl-4 pr-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
              News
            </span>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <motion.div
              className="flex w-max items-center gap-10 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-cream/90"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 26 }}
            >
              {[0, 1].map((dup) => (
                <Link
                  key={dup}
                  to="/lords-cup/season-8"
                  className="inline-flex items-center gap-6 hover:text-gold"
                >
                  <span>Lords Cup Season 8 is Live now →</span>
                  <span className="text-gold">★</span>
                </Link>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* 1. STRONG LORDS OF EWU HERO SECTION */}
      <section className="relative overflow-hidden border-b-2 border-gold/60 bg-forest text-cream pitch-lines">
        <div className="container py-16 md:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8"
            >
              <div className="inline-flex items-center gap-2 rounded-sm border border-gold/40 bg-forest-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                <span>
                  {heroContent.hero_eyebrow ||
                    `${org?.institution ?? 'East West University'} Student-Led Football Community · ${org?.city_country ?? 'Dhaka, Bangladesh'}`}
                </span>
              </div>

              <p className="mt-5 font-display text-sm font-bold uppercase tracking-[0.28em] text-gold">
                {org?.organization_name ?? 'LORDS OF EWU'}
              </p>

              <h1 className="mt-2 font-serif text-4xl font-extrabold leading-[1.06] tracking-tight text-cream sm:text-5xl lg:text-6xl">
                {heroContent.hero_headline || 'MORE THAN A GAME. A COMMUNITY.'}
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-cream/90 md:text-xl">
                {heroContent.hero_subheadline ||
                  org?.philosophy ||
                  'Creating Space for Everyone to Play.'}
              </p>

              <p className="mt-4 font-display text-xl font-bold uppercase tracking-[0.34em] text-gold">
                {heroContent.hero_tagline || org?.tagline || 'KICK · MISS · REPEAT'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <Button variant="gold" size="lg" asChild>
                  <Link to="/lords-cup">
                    Explore Lords Cup
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outlineLight" size="lg" asChild>
                  <Link to="/about">Discover Our Story</Link>
                </Button>
                <Button variant="ghost" size="lg" className="text-cream hover:bg-forest-700" asChild>
                  <Link to="/lords-cup/history">Lords Cup History (S1–S8)</Link>
                </Button>
              </div>
            </motion.div>

            {/* Official Crest Plaque */}
            <motion.div
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center lg:col-span-4"
            >
              <div className="relative flex flex-col items-center rounded-sm border border-gold/40 bg-forest-800/80 p-8 text-center shadow-2xl">
                <ClubCrest
                  logoUrl={org?.logo_url}
                  orgName={org?.organization_name}
                  size="xl"
                  className="h-44 w-44 border-4"
                />
                <div className="mt-5 border-t border-gold/30 pt-4">
                  <p className="font-serif text-2xl font-bold text-cream">
                    {org?.organization_name ?? 'Lords of EWU'}
                  </p>
                  <p className="mt-1 font-display text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                    Creating Space for Everyone to Play
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SEASON 8 SPOTLIGHT BANNER */}
      <section className="border-b-2 border-gold/60 bg-charcoal py-10 text-cream">
        <div className="container">
          <motion.div
            initial={{ opacity: 0.95, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-sm border border-gold/40 bg-forest-900/90 shadow-xl"
          >
            <div className="grid items-center lg:grid-cols-12">
              <div className="lg:col-span-7">
                <img
                  src="/assets/lords-cup-s8-banner.jpg"
                  alt="Lords Cup Season 8 — French Ligue 1 Official Banner"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-4 p-6 sm:p-8 lg:col-span-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">Season 8 Is Here</Badge>
                  <Badge variant="outline" className="border-gold/50 text-gold">
                    French Ligue 1 Edition
                  </Badge>
                </div>
                <h2 className="font-serif text-2xl font-bold text-cream sm:text-3xl">
                  Lords Cup Season 8 — Reserve Your Seat
                </h2>
                <div className="space-y-1.5 text-sm text-cream/85">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold" />
                    10th November · 11:30 PM – Whole Night
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold" />
                    East Court Arena · 6 Players / Team
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="gold" size="lg" asChild>
                    <a href={SEASON_8_REGISTRATION_URL} target="_blank" rel="noreferrer">
                      Reserve Your Seat &amp; Pay
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outlineLight" size="lg" asChild>
                    <Link to="/lords-cup/season-8">Season 8 Details</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2 & 3. ORGANIZATIONAL INTRODUCTION & COMMUNITY PHILOSOPHY */}
      <section className="border-b border-forest/15 bg-cream py-16 md:py-20">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                Who We Are & Our Philosophy
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-charcoal md:text-4xl">
                {heroContent.community_intro_title || 'Football Accessible to Everyone'}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-charcoal-500 md:text-lg">
                {heroContent.community_intro_body ||
                  'Lords of EWU is a student-led football community that originated at East West University, Dhaka. Built around the idea that football should be accessible to everyone—not exclusively to established or highly skilled players—we create opportunities for students and football enthusiasts to participate, compete, connect, and enjoy the game.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {CORE_VALUES.map((pillar) => (
                  <span
                    key={pillar}
                    className="rounded-sm border border-forest/25 bg-cream-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-forest"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link to="/about">Read Our Full Story →</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:col-span-5">
              <Card className="border-forest/20 bg-cream-50">
                <CardContent className="p-5">
                  <Shield className="h-5 w-5 text-forest" />
                  <p className="mt-3 font-serif text-lg font-bold">Every Player Matters</p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-400">
                    No pre-formed squad needed—individual players enter on equal footing.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-forest/20 bg-cream-50">
                <CardContent className="p-5">
                  <Users className="h-5 w-5 text-gold-500" />
                  <p className="mt-3 font-serif text-lg font-bold">Every Player Belongs</p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-400">
                    Connecting students across EWU, BRACU, NSU, and wider student circles.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-forest/20 bg-cream-50">
                <CardContent className="p-5">
                  <Trophy className="h-5 w-5 text-forest" />
                  <p className="mt-3 font-serif text-lg font-bold">Lords Cup Draft</p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-400">
                    Organized player selection and live team draws for balanced competition.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-forest/20 bg-cream-50">
                <CardContent className="p-5">
                  <Calendar className="h-5 w-5 text-gold-500" />
                  <p className="mt-3 font-serif text-lg font-bold">Community First</p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-400">
                    Friendship, sportsmanship, and shared memories on and off the pitch.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY LORDS CUP IS DIFFERENT */}
      <WhyLordsCupDifferent />

      {/* 5. HISTORICAL SEASON TIMELINE (SEASONS 1–8) */}
      <section className="border-b border-forest/15 bg-cream py-16">
        <div className="container">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                Lords Cup Evolution
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold text-charcoal">
                Historical Season Timeline (Seasons 1–8)
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/lords-cup/history">Explore Complete Archive →</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {timelineSeasons.map((season) => (
              <Link
                key={season.id}
                to={`/lords-cup/season-${season.season_number}`}
                className="group block rounded-sm border border-forest/20 bg-cream-50 p-5 transition-all hover:border-gold hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="default">Season {season.season_number}</Badge>
                  {season.documented_team_count !== null && (
                    <span className="font-display text-xs font-bold uppercase text-gold-600">
                      {season.documented_team_count} Teams
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-serif text-lg font-bold text-charcoal group-hover:text-forest">
                  {season.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs text-charcoal-400">
                  {season.description || 'Historical records being updated.'}
                </p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-forest">
                  {season.verification_status === 'awaiting_verification'
                    ? 'Awaiting Verification →'
                    : 'View Chapter →'}
                </p>
              </Link>
            ))}
          </div>

          {/* Active/Featured Lords Cup Card if open or latest */}
          {activeOpenSeason && activeOpenSeason.registration_status === 'open' && (
            <Card className="mt-8 overflow-hidden border-2 border-forest/30 bg-cream-50">
              <div className="flex flex-col justify-between gap-4 bg-forest p-6 text-cream md:flex-row md:items-center">
                <div>
                  <Badge variant="gold">Registration Open · {activeOpenSeason.name}</Badge>
                  <p className="mt-2 font-serif text-2xl font-bold">
                    {FORMAT_LABELS[activeOpenSeason.format]} ·{' '}
                    {formatCurrency(activeOpenSeason.registration_fee, activeOpenSeason.currency)}
                  </p>
                </div>
                <Button variant="gold" asChild>
                  <Link to={`/register?season=${activeOpenSeason.slug}`}>Register Now</Link>
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* 6. COMMUNITY STATISTICS (Strictly separated & labeled accurately) */}
      <section className="border-b border-gold/40 bg-forest py-14 text-cream">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.26em] text-gold">
              Community Profile
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold">Lords of EWU Snapshot</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-sm border border-gold/30 bg-forest-700/60 p-6 text-center">
              <p className="font-display text-4xl font-bold text-gold">
                {stats?.facebook_followers || '750+'}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-cream">
                Facebook Followers
              </p>
              <p className="mt-1 text-[11px] text-cream/65">Latest community page figure</p>
            </div>

            <div className="rounded-sm border border-gold/30 bg-forest-700/60 p-6 text-center">
              <p className="font-display text-4xl font-bold text-gold">
                {stats?.historical_players || '150+'}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-cream">
                Community Players
              </p>
              <p className="mt-1 text-[11px] text-cream/65">Historical portfolio figure</p>
            </div>

            <div className="rounded-sm border border-gold/30 bg-forest-700/60 p-6 text-center">
              <p className="font-display text-4xl font-bold text-gold">
                {stats?.documented_seasons || '8'}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-cream">
                Documented Lords Cup Editions
              </p>
              <p className="mt-1 text-[11px] text-cream/65">6+ completed; latest awaiting verification</p>
            </div>

            <div className="rounded-sm border border-gold/30 bg-forest-700/60 p-6 text-center">
              <p className="font-display text-4xl font-bold text-gold">
                {stats?.fifa_2026_teams || '24'}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-cream">
                Teams in FIFA Edition 2026
              </p>
              <p className="mt-1 text-[11px] text-cream/65">Documented Season 7 milestone</p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-cream/65">
            Community figures are editable in the Admin Dashboard and intentionally separated from
            live tournament registration counts.
          </p>
        </div>
      </section>

      {/* 7 & 8. LATEST ANNOUNCEMENTS + UPCOMING EVENTS */}
      <section className="border-b border-forest/15 bg-cream py-16">
        <div className="container grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                  Club Dispatches
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">Latest Announcements</h2>
              </div>
              <Link to="/community" className="text-xs font-semibold uppercase tracking-wider text-forest hover:underline">
                All Updates →
              </Link>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="muted">{item.category}</Badge>
                        <span className="text-xs text-charcoal-400">
                          {formatDate(item.published_at || item.created_at)}
                        </span>
                      </div>
                      <CardTitle className="pt-1 text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-charcoal-500">
                        {item.summary || item.body.slice(0, 140)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Announcements Published"
                description="Official tournament notices and community dispatches will appear here once published."
              />
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                  Matchday Calendar
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">Upcoming Events & Fixtures</h2>
              </div>
              <Link to="/fixtures" className="text-xs font-semibold uppercase tracking-wider text-forest hover:underline">
                Full Schedule →
              </Link>
            </div>

            {upcomingMatches.length > 0 || completedMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gold-600">
                          {match.season?.name || 'Lords Cup'} · {match.stage.replace('_', ' ')}
                          {match.group_name ? ` · ${match.group_name}` : ''}
                        </p>
                        <p className="mt-1 font-serif text-base font-bold">
                          {match.home_team?.name ?? 'TBA'} vs {match.away_team?.name ?? 'TBA'}
                        </p>
                      </div>
                      <div className="text-xs text-charcoal-400 sm:text-right">
                        <p className="font-semibold text-charcoal">
                          {formatDate(match.match_date, true)}
                        </p>
                        <p>{match.venue || 'Venue TBA'}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {completedMatches.map((match) => (
                  <Card key={match.id} className="border-forest/25 bg-cream-50">
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-forest">
                          Final Result · {match.season?.name || 'Lords Cup'}
                          {match.group_name ? ` · ${match.group_name}` : ''}
                        </p>
                        <p className="mt-1 font-serif text-base font-bold">
                          {match.home_team?.name ?? 'TBA'}{' '}
                          <span className="mx-1 rounded bg-forest px-2 py-0.5 font-display text-sm text-cream">
                            {match.home_score ?? 0} – {match.away_score ?? 0}
                          </span>{' '}
                          {match.away_team?.name ?? 'TBA'}
                        </p>
                      </div>
                      <div className="text-xs text-charcoal-400 sm:text-right">
                        <p className="font-semibold text-charcoal">
                          {formatDate(match.match_date)}
                        </p>
                        {match.potm_player_name && (
                          <p className="text-gold-600">POTM: {match.potm_player_name}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Upcoming Fixtures Scheduled"
                description="Published matchday fixtures and kick-off times will appear here."
                icon={<Calendar className="h-5 w-5" />}
              />
            )}
          </div>
        </div>
      </section>

      {/* 9. PREVIOUS TOURNAMENT HIGHLIGHTS & HONOURS */}
      <section className="border-b border-forest/15 bg-cream-50 py-16">
        <div className="container">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                Honours Board
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold">
                Tournament Highlights & Verified Awards
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/hall-of-fame">Explore Hall of Fame</Link>
            </Button>
          </div>

          {champions.length > 0 || featuredAwards.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {champions.concat(featuredAwards).map((award) => (
                <Card key={award.id} className={award.award_type === 'champion' ? 'border-gold' : ''}>
                  <CardContent className="p-6">
                    <Badge variant={award.award_type === 'champion' ? 'gold' : 'muted'}>
                      {award.award_type.replace('_', ' ')}
                    </Badge>
                    <h3 className="mt-3 font-serif text-xl font-bold">
                      {award.recipient_name || award.team_name}
                    </h3>
                    <p className="mt-1 text-sm text-forest">
                      {award.title} {award.season ? `· ${award.season.name}` : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Hall of Fame Records Being Updated"
              description="Verified Lords Cup champions, runners-up, and individual awards will be displayed here once published by administrators."
              icon={<Trophy className="h-5 w-5" />}
            />
          )}
        </div>
      </section>

      {/* 10. GALLERY */}
      <section className="border-b border-forest/15 bg-cream py-16">
        <div className="container">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                Through the Lens
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold">Community Photographs</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/gallery">Open Full Gallery</Link>
            </Button>
          </div>

          {featuredPhotos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group overflow-hidden rounded-sm border border-forest/20 bg-cream-50"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-charcoal-100">
                    <img
                      src={photo.media_url}
                      alt={photo.caption || photo.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-base font-bold">{photo.title}</p>
                    {photo.caption && (
                      <p className="mt-1 text-xs text-charcoal-400">{photo.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Gallery Ready for Matchday Moments"
              description="Approved tournament, team, and community photographs uploaded via the Admin Gallery will appear here."
              icon={<Camera className="h-5 w-5" />}
            />
          )}
        </div>
      </section>

      {/* 11. FACEBOOK COMMUNITY SECTION */}
      <section className="border-b border-forest/15 bg-cream-50 py-14">
        <div className="container">
          <Card className="border-forest/25 bg-cream">
            <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                  Facebook Community
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal md:text-3xl">
                  {stats?.facebook_followers || '750+'} Followers Connected with Lords of EWU
                </h2>
                <p className="mt-2 max-w-xl text-sm text-charcoal-500">
                  Follow tournament announcements, matchday photography, and community calls for
                  East West University and participating student football circles.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {facebookUrl ? (
                  <Button asChild>
                    <a href={facebookUrl} target="_blank" rel="noreferrer">
                      Visit Facebook Community
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link to="/join-us">Connect With the Community</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 12. JOIN THE COMMUNITY CTA */}
      <section className="bg-charcoal py-16 text-cream">
        <div className="container flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.26em] text-gold">
              Creating Space for Everyone to Play
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              Join the Lords of EWU Community.
            </h2>
            <p className="mt-3 text-base text-cream/80">
              Every Player Matters. Every Player Belongs. Every Player Gets A Chance. Apply for
              general community membership or check open Lords Cup registrations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" size="lg" asChild>
              <Link to="/join-us">Apply for Community Membership</Link>
            </Button>
            <Button variant="outlineLight" size="lg" asChild>
              <Link to="/register">Tournament Registration</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
