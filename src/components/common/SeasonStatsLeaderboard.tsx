import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import type { SeasonPlayerStat } from '@/types/database';

interface SeasonStatsLeaderboardProps {
  stats: SeasonPlayerStat[];
  title?: string;
}

export function SeasonStatsLeaderboard({
  stats,
  title = 'Top Scorers & Player Statistics',
}: SeasonStatsLeaderboardProps) {
  const scorers = stats.filter((s) => s.goals > 0 || s.assists > 0);
  const disciplinary = stats.filter((s) => s.yellow_cards > 0 || s.red_cards > 0);

  if (stats.length === 0) {
    return (
      <EmptyState
        title="No Player Match Statistics Yet"
        description="Goals, assists, and cards recorded in published matches are automatically totaled here."
        icon={<Trophy className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scorers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">Goals</TableHead>
                  <TableHead className="text-center">Pen</TableHead>
                  <TableHead className="text-center">Assists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scorers.map((row, idx) => (
                  <TableRow key={`${row.team_id}-${row.player_name}`}>
                    <TableCell className="font-bold">
                      {idx === 0 && row.goals > 0 ? (
                        <Badge variant="gold">1</Badge>
                      ) : (
                        idx + 1
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{row.player_name}</TableCell>
                    <TableCell className="text-xs text-charcoal-500">{row.team_name}</TableCell>
                    <TableCell className="text-center font-display text-lg font-bold text-forest">
                      {row.goals}
                    </TableCell>
                    <TableCell className="text-center text-xs text-charcoal-400">
                      {row.penalty_goals}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{row.assists}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-charcoal-400">No goals or assists recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Discipline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {disciplinary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">YC</TableHead>
                  <TableHead className="text-center">RC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplinary.map((row) => (
                  <TableRow key={`disc-${row.team_id}-${row.player_name}`}>
                    <TableCell>
                      <p className="text-sm font-semibold">{row.player_name}</p>
                      <p className="text-[11px] text-charcoal-400">{row.team_name}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold text-amber-600">
                      {row.yellow_cards}
                    </TableCell>
                    <TableCell className="text-center font-bold text-red-700">
                      {row.red_cards}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-charcoal-400">No cards recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
