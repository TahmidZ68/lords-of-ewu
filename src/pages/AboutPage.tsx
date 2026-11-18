import { Link } from 'react-router-dom';
import { BookOpen, Compass, Globe2, HeartHandshake, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { useOrganization } from '@/hooks/useOrganization';
import { useCmsPage, usePublicMembers } from '@/hooks/usePublicData';

const DEFAULT_VALUES = [
  'Every Player Matters',
  'Every Player Belongs',
  'Every Player Gets A Chance',
  'Inclusive Participation',
  'Sportsmanship',
  'Community Building',
  'Friendship and Competition',
];

const PARTICIPATING_COMMUNITIES = [
  'East West University',
  'BRAC University',
  'North South University',
  'Other Student Football Communities',
];

export function AboutPage() {
  const { data: org } = useOrganization();
  const { data: aboutPage } = useCmsPage('about');
  const { data: members = [] } = usePublicMembers();

  const content = (aboutPage?.content ?? {}) as {
    intro?: string;
    story?: string;
    philosophy?: string;
    mission?: string;
    vision?: string;
    values?: string[];
    history?: string;
    activities?: string;
  };

  const leadership = members.filter((m) => m.member_type === 'leadership');
  const values =
    Array.isArray(content.values) && content.values.length > 0
      ? content.values
      : DEFAULT_VALUES;

  return (
    <>
      <SeoHead
        title="About Us & Our Story"
        description="Learn how Lords of EWU began at East West University, our inclusive football philosophy, inter-university growth, and vision."
      />
      <PageBanner
        eyebrow={`${org?.institution ?? 'East West University'} · ${org?.city_country ?? 'Dhaka, Bangladesh'}`}
        title={aboutPage?.title || 'About Lords of EWU'}
        subtitle={
          aboutPage?.subtitle ||
          'Creating Space for Everyone to Play — our beginning, philosophy, growth, and vision.'
        }
      />

      <section className="container py-14 space-y-12">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            {/* Our Beginning */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-forest">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-display text-xs font-bold uppercase tracking-[0.22em]">
                    Our Beginning
                  </span>
                </div>
                <CardTitle className="text-2xl">How Lords of EWU Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-charcoal-500 md:text-base">
                <p>
                  {content.intro ||
                    'Lords of EWU is a student-led football community that originated at East West University, Dhaka. It was built around the idea that football should be accessible to everyone, not exclusively to established or highly skilled players.'}
                </p>
                <p className="whitespace-pre-line">
                  {content.story ||
                    'Lords of EWU began with a simple idea: everyone deserves an opportunity to play football. Traditional football tournaments often rely on pre-existing teams and established groups of players, leaving students who love football but do not belong to established teams without an opportunity to participate. Through individual registration and organized player selection, Lords Cup created an opportunity for participants to experience competition, teamwork, and community.'}
                </p>
              </CardContent>
            </Card>

            {/* Our Philosophy */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-forest">
                  <Compass className="h-5 w-5" />
                  <span className="font-display text-xs font-bold uppercase tracking-[0.22em]">
                    Our Philosophy
                  </span>
                </div>
                <CardTitle className="text-2xl">More Than Winning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-charcoal-500 md:text-base">
                <p>
                  {content.philosophy ||
                    'We believe football is about more than winning. It is about friendship, teamwork, learning, inclusion, and shared experiences. Our goal is to create an environment where players of different skill levels can participate without feeling excluded.'}
                </p>
              </CardContent>
            </Card>

            {/* Our Growth */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-forest">
                  <Globe2 className="h-5 w-5" />
                  <span className="font-display text-xs font-bold uppercase tracking-[0.22em]">
                    Our Growth
                  </span>
                </div>
                <CardTitle className="text-2xl">Expanding Beyond Campus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-charcoal-500 md:text-base">
                <p>
                  {content.history ||
                    'What began within the East West University student community gradually expanded to welcome participants from other universities.'}
                </p>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-forest">
                    Participating University Communities (Not Official Institutional Partners)
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {PARTICIPATING_COMMUNITIES.map((uni) => (
                      <Badge key={uni} variant="muted">
                        {uni}
                      </Badge>
                    ))}
                  </div>
                </div>
                {org?.founding_date && (
                  <p className="text-xs font-semibold text-forest">
                    Confirmed Founding Date: {org.founding_date}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mission, Vision, Core Values */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-forest/25 bg-forest text-cream">
              <CardHeader>
                <CardTitle className="text-cream">Mission & Vision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-cream/85">
                <div>
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
                    Primary Philosophy
                  </h3>
                  <p className="mt-1 font-semibold text-cream">
                    {org?.philosophy || 'Creating Space for Everyone to Play.'}
                  </p>
                </div>
                <div className="border-t border-gold/25 pt-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
                    Mission
                  </h3>
                  <p className="mt-1">
                    {content.mission ||
                      'Creating opportunities for students and football enthusiasts to participate, compete, connect, and enjoy football regardless of background or skill level.'}
                  </p>
                </div>
                <div className="border-t border-gold/25 pt-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-gold">
                    Our Vision
                  </h3>
                  <p className="mt-1">
                    {content.vision ||
                      'To build a respected and inclusive student football community in Bangladesh, create more opportunities for university students to participate in football, and establish a sustainable platform for inter-university competition, networking, sportsmanship, and talent development.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-forest">
                  <HeartHandshake className="h-5 w-5" />
                  <span className="font-display text-xs font-bold uppercase tracking-[0.22em]">
                    Core Values
                  </span>
                </div>
                <CardTitle>What We Stand For</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {values.map((val) => (
                    <li
                      key={val}
                      className="flex items-center gap-2.5 rounded-sm border border-forest/15 bg-cream px-3.5 py-2.5 text-sm font-semibold text-charcoal"
                    >
                      <Shield className="h-4 w-4 text-gold-500" />
                      {val}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leadership Team */}
        <div>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-forest">
                Stewardship
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold">Leadership Team</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/lords-cup/history">Explore Lords Cup History</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/community">Community Directory</Link>
              </Button>
            </div>
          </div>

          {leadership.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leadership.map((leader) => (
                <Card key={leader.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-forest text-lg font-bold text-cream">
                        {leader.avatar_url ? (
                          <img
                            src={leader.avatar_url}
                            alt={leader.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          leader.full_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold">{leader.full_name}</h3>
                        <p className="text-xs font-semibold uppercase tracking-wider text-forest">
                          {leader.role_title || 'Leadership'}
                        </p>
                        {(leader.department || leader.batch) && (
                          <p className="text-xs text-charcoal-400">
                            {[leader.department, leader.batch].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {leader.bio && (
                      <p className="mt-4 text-sm text-charcoal-500">{leader.bio}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Leadership Roster Unpublished"
              description="Verified leadership profiles will appear here once published by administrators without fabricating names or founders."
              icon={<Users className="h-5 w-5" />}
            />
          )}
        </div>
      </section>
    </>
  );
}
