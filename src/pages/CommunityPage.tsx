import { Link } from 'react-router-dom';
import { Megaphone, Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import {
  useCmsPage,
  usePublicMembers,
  usePublishedAnnouncements,
} from '@/hooks/usePublicData';
import { formatDate } from '@/lib/utils';

export function CommunityPage() {
  const { data: page } = useCmsPage('community');
  const { data: members = [] } = usePublicMembers();
  const { data: announcements = [] } = usePublishedAnnouncements(8);

  const content = (page?.content ?? {}) as { intro?: string; activities_summary?: string };
  const leadership = members.filter((m) => m.member_type === 'leadership');
  const committee = members.filter((m) => m.member_type === 'committee');
  const publicMembers = members.filter((m) => m.member_type === 'member');

  return (
    <>
      <SeoHead
        title="Community"
        description="Explore the Lords of EWU community, leadership, organizing committee, public member directory, and announcements."
      />
      <PageBanner
        eyebrow="Brotherhood & Sporting Life"
        title={page?.title || 'Lords of EWU Community'}
        subtitle={
          page?.subtitle ||
          'Built through football, strengthened by friendship, united by competition.'
        }
        rightSlot={
          <Button variant="gold" asChild>
            <Link to="/join-us">Join the Community</Link>
          </Button>
        }
      />

      <section className="container py-14 space-y-12">
        {/* Intro & Activities */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Community Overview</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-charcoal-500">
              {content.intro ||
                'Lords of EWU connects students and alumni around football culture, organized matchdays, and community events at East West University.'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activities & Gatherings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-charcoal-500">
              {content.activities_summary ||
                'Regular football sessions, seasonal Lords Cup tournaments, squad draws, and community outreach organized throughout the academic year.'}
            </CardContent>
          </Card>
        </div>

        {/* Leadership & Organizing Committee */}
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold">Leadership & Organizing Committee</h2>
            <p className="mt-1 text-sm text-charcoal-400">
              Only publicly approved profiles are displayed.
            </p>
          </div>

          {leadership.length > 0 || committee.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...leadership, ...committee].map((person) => (
                <Card key={person.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-bold">{person.full_name}</h3>
                        <p className="text-xs font-semibold uppercase tracking-wider text-forest">
                          {person.role_title || person.member_type}
                        </p>
                      </div>
                      <Badge variant={person.member_type === 'leadership' ? 'gold' : 'muted'}>
                        {person.member_type}
                      </Badge>
                    </div>
                    {(person.department || person.batch) && (
                      <p className="mt-2 text-xs text-charcoal-400">
                        {[person.department, person.batch].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {person.bio && <p className="mt-3 text-sm text-charcoal-500">{person.bio}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Leadership & Committee Not Published"
              description="Approved leadership and organizing committee members will appear here once published."
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          )}
        </div>

        {/* Approved Public Members */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl font-bold">Public Member Directory</h2>
            <Link
              to="/players"
              className="text-xs font-semibold uppercase tracking-wider text-forest hover:underline"
            >
              View All Public Player Profiles →
            </Link>
          </div>
          {publicMembers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {publicMembers.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <p className="font-serif text-base font-bold">{m.full_name}</p>
                    <p className="text-xs text-forest">
                      {m.preferred_position || 'Community Member'}
                    </p>
                    {(m.department || m.batch) && (
                      <p className="mt-1 text-xs text-charcoal-400">
                        {[m.department, m.batch].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Public Member Profiles Listed"
              description="Members who opt into public listing and receive admin approval appear here."
              icon={<Users className="h-5 w-5" />}
            />
          )}
        </div>

        {/* Community Announcements */}
        <div>
          <h2 className="mb-4 font-serif text-2xl font-bold">Community Announcements</h2>
          {announcements.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((a) => (
                <Card key={a.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="muted">{a.category}</Badge>
                      <span className="text-xs text-charcoal-400">
                        {formatDate(a.published_at || a.created_at)}
                      </span>
                    </div>
                    <CardTitle className="pt-1 text-lg">{a.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-sm text-charcoal-500">{a.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Announcements Yet"
              description="Community dispatches and event updates will appear here."
              icon={<Megaphone className="h-5 w-5" />}
            />
          )}
        </div>
      </section>
    </>
  );
}
