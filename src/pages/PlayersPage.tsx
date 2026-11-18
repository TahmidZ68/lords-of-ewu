import { useMemo, useState } from 'react';
import { Award, Search, Shield, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageBanner } from '@/components/common/PageBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import {
  usePublicMembers,
  usePublicPlayerProfiles,
  usePublishedSeasons,
} from '@/hooks/usePublicData';
import type { PublicMember, PublicPlayerProfile } from '@/types/database';

type SelectedProfile =
  | { kind: 'tournament'; data: PublicPlayerProfile }
  | { kind: 'community'; data: PublicMember };

export function PlayersPage() {
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [selected, setSelected] = useState<SelectedProfile | null>(null);

  const { data: seasons = [] } = usePublishedSeasons();
  const { data: playerProfiles = [], isLoading: loadingPlayers } =
    usePublicPlayerProfiles(seasonFilter);
  const { data: communityMembers = [], isLoading: loadingMembers } = usePublicMembers();

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playerProfiles;
    return playerProfiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.team_name ?? '').toLowerCase().includes(q) ||
        (p.preferred_position ?? '').toLowerCase().includes(q) ||
        (p.department ?? '').toLowerCase().includes(q)
    );
  }, [playerProfiles, search]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return communityMembers;
    return communityMembers.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.role_title ?? '').toLowerCase().includes(q) ||
        (m.preferred_position ?? '').toLowerCase().includes(q) ||
        (m.department ?? '').toLowerCase().includes(q)
    );
  }, [communityMembers, search]);

  const isLoading = loadingPlayers || loadingMembers;

  return (
    <>
      <SeoHead
        title="Player Profiles"
        description="Public sporting profiles for approved Lords Cup players and community members who have been granted public profile access."
      />
      <PageBanner
        eyebrow="Approved Sporting Directory"
        title="Public Player Profiles"
        subtitle="Player and member profiles are published here only when approved and granted public profile access by administrators."
      />

      <section className="container py-12 space-y-10">
        {/* Search & Season Filter */}
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-forest/15 bg-cream-50 p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-300" />
            <Input
              className="pl-9"
              placeholder="Search player name, team, position, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="All Seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Published Seasons</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  S{s.season_number}: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-charcoal-400">Loading public player profiles...</p>
        ) : filteredPlayers.length === 0 && filteredMembers.length === 0 ? (
          <EmptyState
            title="No Public Player Profiles Published Yet"
            description="Approved players and community members appear here once an administrator grants public profile access."
            icon={<Users className="h-5 w-5" />}
          />
        ) : (
          <>
            {/* Tournament Player Profiles */}
            {filteredPlayers.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold">
                    Lords Cup Player Profiles ({filteredPlayers.length})
                  </h2>
                  <p className="text-xs text-charcoal-400">
                    Click any player card to inspect full match stats and bio.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPlayers.map((player) => (
                    <button
                      key={`${player.id}-${player.season_id}`}
                      type="button"
                      onClick={() => setSelected({ kind: 'tournament', data: player })}
                      className="text-left"
                    >
                      <Card className="h-full transition-shadow hover:border-gold hover:shadow-md">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-forest text-base font-bold text-cream">
                              {player.public_avatar_url ? (
                                <img
                                  src={player.public_avatar_url}
                                  alt={player.full_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                player.full_name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="truncate font-serif text-lg font-bold">
                                  {player.full_name}
                                </h3>
                                {player.is_captain && (
                                  <Badge variant="gold" className="text-[10px]">
                                    C
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-forest">
                                {player.team_name || 'Squad Pending'} ·{' '}
                                {player.preferred_position || 'Player'}
                              </p>
                              <p className="text-[11px] text-charcoal-400">
                                S{player.season_number}: {player.season_name}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-t border-forest/10 pt-3 text-center text-xs">
                            <div>
                              <p className="font-display text-lg font-bold text-forest">
                                {player.goals}
                              </p>
                              <p className="text-[10px] uppercase text-charcoal-400">Goals</p>
                            </div>
                            <div>
                              <p className="font-display text-lg font-bold text-charcoal">
                                {player.assists}
                              </p>
                              <p className="text-[10px] uppercase text-charcoal-400">Assists</p>
                            </div>
                            <div>
                              <p className="font-display text-lg font-bold text-amber-700">
                                {player.yellow_cards}/{player.red_cards}
                              </p>
                              <p className="text-[10px] uppercase text-charcoal-400">YC / RC</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Community Member Public Profiles */}
            {filteredMembers.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold">
                    Community & Leadership Profiles ({filteredMembers.length})
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelected({ kind: 'community', data: member })}
                      className="text-left"
                    >
                      <Card className="h-full transition-shadow hover:border-gold hover:shadow-md">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold bg-forest text-xs font-bold text-cream">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              member.full_name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-serif text-base font-bold">
                              {member.full_name}
                            </p>
                            <p className="truncate text-xs font-semibold text-forest">
                              {member.role_title || member.preferred_position || member.member_type}
                            </p>
                            {(member.department || member.batch) && (
                              <p className="truncate text-[11px] text-charcoal-400">
                                {[member.department, member.batch].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Public Profile Detail Dialog (Zero PII) */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected?.kind === 'tournament' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-forest text-xl font-bold text-cream">
                    {selected.data.public_avatar_url ? (
                      <img
                        src={selected.data.public_avatar_url}
                        alt={selected.data.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      selected.data.full_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <DialogTitle>{selected.data.full_name}</DialogTitle>
                    <DialogDescription>
                      {selected.data.team_name || 'Lords Cup Player'} ·{' '}
                      {selected.data.preferred_position || 'Player'}
                      {selected.data.jersey_number ? ` · #${selected.data.jersey_number}` : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">
                    S{selected.data.season_number}: {selected.data.season_name}
                  </Badge>
                  {selected.data.is_captain && <Badge variant="gold">Team Captain</Badge>}
                  {selected.data.department && (
                    <Badge variant="muted">{selected.data.department}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 rounded-sm border border-forest/15 bg-cream-100 p-4 text-center">
                  <div>
                    <p className="font-display text-2xl font-bold text-forest">
                      {selected.data.goals}
                    </p>
                    <p className="text-[10px] uppercase text-charcoal-400">Goals</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-charcoal">
                      {selected.data.assists}
                    </p>
                    <p className="text-[10px] uppercase text-charcoal-400">Assists</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-amber-700">
                      {selected.data.yellow_cards}
                    </p>
                    <p className="text-[10px] uppercase text-charcoal-400">Yellow</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-red-700">
                      {selected.data.red_cards}
                    </p>
                    <p className="text-[10px] uppercase text-charcoal-400">Red</p>
                  </div>
                </div>

                {selected.data.public_bio && (
                  <p className="leading-relaxed text-charcoal-500">{selected.data.public_bio}</p>
                )}
              </div>
            </>
          )}

          {selected?.kind === 'community' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-forest text-xl font-bold text-cream">
                    {selected.data.avatar_url ? (
                      <img
                        src={selected.data.avatar_url}
                        alt={selected.data.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      selected.data.full_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <DialogTitle>{selected.data.full_name}</DialogTitle>
                    <DialogDescription>
                      {selected.data.role_title || selected.data.member_type}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">
                    <Shield className="mr-1 h-3 w-3" />
                    {selected.data.member_type}
                  </Badge>
                  {selected.data.preferred_position && (
                    <Badge variant="gold">
                      <Award className="mr-1 h-3 w-3" />
                      {selected.data.preferred_position}
                    </Badge>
                  )}
                  {(selected.data.department || selected.data.batch) && (
                    <Badge variant="muted">
                      {[selected.data.department, selected.data.batch].filter(Boolean).join(' · ')}
                    </Badge>
                  )}
                </div>
                {selected.data.bio && (
                  <p className="leading-relaxed text-charcoal-500">{selected.data.bio}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
