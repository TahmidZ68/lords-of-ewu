import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Maximize2, Play, RotateCcw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClubCrest } from '@/components/common/ClubCrest';
import { EmptyState } from '@/components/common/EmptyState';
import { SeoHead } from '@/components/common/SeoHead';
import { usePublicDraw, usePublishedSeasons } from '@/hooks/usePublicData';

export function LiveDrawDisplayPage() {
  const [searchParams] = useSearchParams();
  const { data: seasons = [] } = usePublishedSeasons();
  const slug = searchParams.get('season');
  const season =
    (slug ? seasons.find((s) => s.slug === slug) : undefined) ?? seasons[0] ?? null;

  const { data: drawData, isLoading } = usePublicDraw(season?.id);
  const participants = drawData?.participants ?? [];

  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [autoPlaying, setAutoPlaying] = useState<boolean>(false);

  useEffect(() => {
    setRevealedCount(participants.length);
  }, [participants.length]);

  useEffect(() => {
    if (!autoPlaying) return;
    if (revealedCount >= participants.length) {
      setAutoPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, 650);
    return () => clearTimeout(timer);
  }, [autoPlaying, revealedCount, participants.length]);

  const teamsMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; players: typeof participants }>();
    for (const p of participants.slice(0, revealedCount)) {
      if (!map.has(p.team_id)) {
        map.set(p.team_id, {
          name: p.team_name,
          color: p.team_color || '#153D2B',
          players: [],
        });
      }
      map.get(p.team_id)!.players.push(p);
    }
    return Array.from(map.entries());
  }, [participants, revealedCount]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="min-h-screen bg-forest text-cream pitch-lines">
      <SeoHead title="Live Draw Display" description="Official Lords Cup Live Team Draw projection screen." />

      <div className="container py-8 space-y-8">
        <div className="flex flex-col gap-4 border-b border-gold/40 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <ClubCrest size="md" />
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.26em] text-gold">
                Official Live Draw Projection
              </p>
              <h1 className="font-serif text-3xl font-bold">
                {drawData?.draw?.title || (season ? `${season.name} Team Draw` : 'Lords Cup Draw')}
              </h1>
            </div>
          </div>

          {drawData?.draw && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  setRevealedCount(0);
                  setAutoPlaying(true);
                }}
              >
                <Play className="h-4 w-4" />
                Replay Animated Reveal
              </Button>
              <Button
                variant="outlineLight"
                size="sm"
                onClick={() => {
                  setAutoPlaying(false);
                  setRevealedCount(participants.length);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Show All
              </Button>
              <Button variant="outlineLight" size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-cream/75">Loading draw results...</p>
        ) : !drawData?.draw ? (
          <EmptyState
            className="border-gold/40 bg-forest-800/70 text-cream"
            title="No Public Draw Published Yet"
            description="When tournament organizers conduct and publish the official draw, squad allocations can be projected live here."
            icon={<Shuffle className="h-5 w-5" />}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cream/75">
              <span>
                Seed Audit Reference:{' '}
                <code className="rounded bg-charcoal px-2 py-0.5 text-gold">
                  {drawData.draw.seed.slice(0, 12)}...
                </code>
              </span>
              <span>
                Revealed: {revealedCount} / {participants.length} players
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {teamsMap.map(([teamId, team]) => (
                <div
                  key={teamId}
                  className="rounded-sm border border-gold/40 bg-forest-800/90 p-5 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-gold/25 pb-3">
                    <h2 className="font-serif text-xl font-bold text-gold">{team.name}</h2>
                    <Badge variant="gold">{team.players.length}</Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {team.players.map((player) => (
                      <motion.li
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between rounded-sm bg-forest-900/70 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-cream">
                          <span className="mr-2 font-display text-xs text-gold">
                            #{player.draw_order}
                          </span>
                          {player.player_name}
                        </span>
                        <span className="text-xs text-cream/65">
                          {player.preferred_position || 'Player'}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
