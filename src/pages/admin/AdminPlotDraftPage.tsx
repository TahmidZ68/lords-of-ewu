import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Save, Undo2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SeoHead } from '@/components/common/SeoHead';
import { SpinningWheel } from '@/components/admin/SpinningWheel';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Season } from '@/types/database';

type PlotKey = 'TEAM' | 'GK' | 'A' | 'B' | 'C' | 'D' | 'E';
type DraftPlotKey = 'TEAM' | 'A' | 'B' | 'C' | 'D' | 'E';

const DRAFT_ORDER: DraftPlotKey[] = ['TEAM', 'A', 'B', 'C', 'D', 'E'];

interface PlotMap {
  TEAM: string[];
  GK: string[];
  A: string[];
  B: string[];
  C: string[];
  D: string[];
  E: string[];
}

interface DraftAssignment {
  gkIndex: number;
  gkName: string;
  plot: DraftPlotKey;
  player: string;
}

const EMPTY_PLOTS: PlotMap = { TEAM: [], GK: [], A: [], B: [], C: [], D: [], E: [] };

export function AdminPlotDraftPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can('manage_teams_draw');

  const [seasonId, setSeasonId] = useState('');
  const [plots, setPlots] = useState<PlotMap>(EMPTY_PLOTS);
  const [assignments, setAssignments] = useState<DraftAssignment[]>([]);
  const [currentPlot, setCurrentPlot] = useState<DraftPlotKey>('A');
  const [currentGkIndex, setCurrentGkIndex] = useState(0);
  const [lastPicked, setLastPicked] = useState<DraftAssignment | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkInputs, setBulkInputs] = useState<Record<PlotKey, string>>({
    TEAM: '',
    GK: '',
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin_seasons'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .order('season_number', { ascending: false });
      return (data ?? []) as Season[];
    },
  });

  useEffect(() => {
    if (seasons.length > 0 && !seasonId) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  const { data: savedDraft } = useQuery({
    queryKey: ['admin_plot_draft', seasonId],
    enabled: Boolean(seasonId),
    queryFn: async () => {
      if (!supabase || !seasonId) return null;
      const { data } = await supabase
        .from('plot_drafts')
        .select('*')
        .eq('season_id', seasonId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (savedDraft) {
      setPlots({ ...EMPTY_PLOTS, ...(savedDraft.plots ?? {}) });
      setAssignments(savedDraft.assignments ?? []);
      setCurrentPlot((savedDraft.current_plot as DraftPlotKey) || 'A');
      setCurrentGkIndex(savedDraft.current_gk_index ?? 0);
    } else {
      setPlots(EMPTY_PLOTS);
      setAssignments([]);
      setCurrentPlot('A');
      setCurrentGkIndex(0);
    }
    setLastPicked(null);
  }, [savedDraft, seasonId]);

  const gkList = plots.GK;
  const assignedSet = new Set(assignments.map((a) => `${a.plot}:${a.player}`));
  const remainingInPlot = (plot: DraftPlotKey) =>
    plots[plot].filter((p) => !assignedSet.has(`${plot}:${p}`));

  const activeRemaining = remainingInPlot(currentPlot);
  const currentGkName = gkList[currentGkIndex] ?? null;

  const isDraftComplete =
    gkList.length === 0 ||
    (DRAFT_ORDER.every((p) => remainingInPlot(p).length === 0));

  const addPlayersToPlot = (key: PlotKey) => {
    const raw = bulkInputs[key];
    const items = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;

    setPlots((prev) => ({
      ...prev,
      [key]: Array.from(new Set([...prev[key], ...items])),
    }));
    setBulkInputs((prev) => ({ ...prev, [key]: '' }));
  };

  const removePlayerFromPlot = (key: PlotKey, name: string) => {
    setPlots((prev) => ({
      ...prev,
      [key]: prev[key].filter((p) => p !== name),
    }));
  };

  const advanceTurn = (nextAssignments: DraftAssignment[], plot: DraftPlotKey, gkIdx: number) => {
    const used = new Set(nextAssignments.map((a) => `${a.plot}:${a.player}`));
    const remInCurrent = plots[plot].filter((p) => !used.has(`${plot}:${p}`));

    // Move to next GK in same plot if players remain and not all GKs have picked in this plot
    if (gkIdx + 1 < gkList.length && remInCurrent.length > 0) {
      setCurrentGkIndex(gkIdx + 1);
      return;
    }

    // Otherwise move to next non-empty plot starting from GK #1 (index 0)
    const startIdx = DRAFT_ORDER.indexOf(plot);
    for (let i = startIdx + 1; i < DRAFT_ORDER.length; i++) {
      const candidate = DRAFT_ORDER[i];
      const rem = plots[candidate].filter((p) => !used.has(`${candidate}:${p}`));
      if (rem.length > 0) {
        setCurrentPlot(candidate);
        setCurrentGkIndex(0);
        return;
      }
    }

    // Fallback: wrap to first plot with remaining players
    for (const candidate of DRAFT_ORDER) {
      const rem = plots[candidate].filter((p) => !used.has(`${candidate}:${p}`));
      if (rem.length > 0) {
        setCurrentPlot(candidate);
        setCurrentGkIndex(0);
        return;
      }
    }
  };

  const handleWheelResult = (winner: string) => {
    if (!currentGkName) return;
    const pick: DraftAssignment = {
      gkIndex: currentGkIndex,
      gkName: currentGkName,
      plot: currentPlot,
      player: winner,
    };
    const nextAssignments = [...assignments, pick];
    setAssignments(nextAssignments);
    setLastPicked(pick);
    advanceTurn(nextAssignments, currentPlot, currentGkIndex);
    toast({
      title: `Plot ${currentPlot} → ${winner}`,
      description: `Drafted by GK #${currentGkIndex + 1} (${currentGkName})`,
      variant: 'success',
    });
  };

  const undoLastPick = () => {
    if (assignments.length === 0) return;
    const last = assignments[assignments.length - 1];
    setAssignments((prev) => prev.slice(0, -1));
    setCurrentPlot(last.plot);
    setCurrentGkIndex(last.gkIndex);
    setLastPicked(null);
  };

  const resetDraft = () => {
    setAssignments([]);
    setCurrentPlot('A');
    setCurrentGkIndex(0);
    setLastPicked(null);
  };

  const saveToDatabase = async () => {
    if (!supabase || !seasonId || !canManage) return;
    setSaving(true);
    const { error } = await supabase.from('plot_drafts').upsert(
      {
        season_id: seasonId,
        plots,
        assignments,
        current_plot: currentPlot,
        current_gk_index: currentGkIndex,
      },
      { onConflict: 'season_id' }
    );
    setSaving(false);

    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'error' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin_plot_draft', seasonId] });
    toast({ title: 'Plot & Draft State Saved', variant: 'success' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Player Plotting & Wheel Draft" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Player Plotting & Wheel Draft</h1>
          <p className="text-sm text-charcoal-400">
            List players into GK and Plots A–E, then spin the random wheel starting from GK #1 on
            Plot A, moving through every GK before advancing to the next plot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  S{s.season_number}: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && seasonId && (
            <Button onClick={saveToDatabase} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Progress'}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="wheel">
        <TabsList>
          <TabsTrigger value="setup">1. Setup Plots (GK, A–E)</TabsTrigger>
          <TabsTrigger value="wheel">2. Live Spinning Wheel Draft</TabsTrigger>
        </TabsList>

        {/* TAB 1: SETUP PLOTS */}
        <TabsContent value="setup" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(['TEAM', 'GK', 'A', 'B', 'C', 'D', 'E'] as PlotKey[]).map((key) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {key === 'TEAM'
                      ? 'Team Names'
                      : key === 'GK'
                      ? 'GK (Team Captains)'
                      : `Plot ${key}`}
                  </CardTitle>
                  <Badge variant="gold">{plots[key].length}</Badge>
                </div>
                <CardDescription>
                  {key === 'TEAM'
                    ? 'New team names to be drawn by each GK'
                    : key === 'GK'
                    ? 'Listed in draft order (GK #1, GK #2, ...)'
                    : `Players available in Plot ${key}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add names (comma-separated)"
                    value={bulkInputs[key]}
                    onChange={(e) =>
                      setBulkInputs((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPlayersToPlot(key);
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => addPlayersToPlot(key)}>
                    Add
                  </Button>
                </div>

                <ul className="max-h-52 space-y-1 overflow-y-auto text-xs">
                  {plots[key].map((name, idx) => (
                    <li
                      key={`${name}-${idx}`}
                      className="flex items-center justify-between rounded bg-cream-100 px-2.5 py-1.5"
                    >
                      <span className="font-medium">
                        {key === 'GK' ? `#${idx + 1} ` : ''}
                        {name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePlayerFromPlot(key, name)}
                        className="text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 2: LIVE SPINNING WHEEL DRAFT */}
        <TabsContent value="wheel" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Wheel Stage */}
            <Card className="border-gold bg-forest text-cream lg:col-span-5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="gold">
                    {isDraftComplete
                      ? 'Draft Complete'
                      : currentPlot === 'TEAM'
                      ? 'Team Names'
                      : `Plot ${currentPlot}`}
                  </Badge>
                  <Button
                    variant="outlineLight"
                    size="sm"
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardTitle className="pt-2 text-2xl text-cream">
                  {gkList.length === 0
                    ? 'Add GKs in Setup Plots First'
                    : isDraftComplete
                    ? 'All Plots Drafted!'
                    : `Turn: GK #${currentGkIndex + 1} — ${currentGkName}`}
                </CardTitle>
                {lastPicked && (
                  <CardDescription className="text-gold">
                    Last Pick: <strong>{lastPicked.player}</strong> (Plot {lastPicked.plot}) → GK #
                    {lastPicked.gkIndex + 1} ({lastPicked.gkName})
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-6 py-4">
                <SpinningWheel
                  items={activeRemaining}
                  disabled={!canManage || gkList.length === 0 || isDraftComplete}
                  onResult={handleWheelResult}
                />

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Select
                    value={currentPlot}
                    onValueChange={(v) => {
                      setCurrentPlot(v as DraftPlotKey);
                      setCurrentGkIndex(0);
                    }}
                  >
                    <SelectTrigger className="w-36 border-gold/40 bg-forest-800 text-cream">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRAFT_ORDER.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === 'TEAM' ? 'Team Names' : `Plot ${p}`} ({remainingInPlot(p).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outlineLight"
                    size="sm"
                    onClick={undoLastPick}
                    disabled={assignments.length === 0}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </Button>
                  <Button
                    variant="outlineLight"
                    size="sm"
                    onClick={resetDraft}
                    disabled={assignments.length === 0}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Drafted Squads Board */}
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {gkList.map((gk, idx) => {
                const squad = assignments.filter((a) => a.gkIndex === idx);
                const drawnTeam = squad.find((a) => a.plot === 'TEAM')?.player;
                const playerPicks = squad.filter((a) => a.plot !== 'TEAM');
                const isTurn = !isDraftComplete && idx === currentGkIndex;
                return (
                  <Card
                    key={`${gk}-${idx}`}
                    className={isTurn ? 'border-2 border-gold shadow-md' : ''}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            GK #{idx + 1}: {gk}
                          </CardTitle>
                          {drawnTeam && (
                            <p className="text-xs font-bold uppercase tracking-wider text-forest">
                              Team: {drawnTeam}
                            </p>
                          )}
                        </div>
                        {isTurn && <Badge variant="gold">Spinning Next</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {playerPicks.length > 0 ? (
                        <ul className="space-y-1 text-xs">
                          {playerPicks.map((pick, pIdx) => (
                            <li
                              key={`${pick.plot}-${pick.player}-${pIdx}`}
                              className="flex items-center justify-between rounded bg-cream-100 px-2.5 py-1.5"
                            >
                              <span className="font-semibold">{pick.player}</span>
                              <Badge variant="muted">Plot {pick.plot}</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-charcoal-400">No players drafted yet.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
