import { useQuery } from '@tanstack/react-query';
import {
  fetchNflState,
  fetchWeekProjections,
  resolveProjectionSeason,
  resolveProjectionWeek,
} from './sleeper-projections-api';
import {
  buildMockPriorityInsights,
  buildStartSitFromRoster,
  type PriorityInsight,
} from './start-sit';
import { fetchMyTeamRoster } from './team-roster-api';

function collectPlayerIds(insight: PriorityInsight): string[] {
  const ids: string[] = [];
  if (insight.start?.id) ids.push(insight.start.id);
  if (insight.sit?.id) ids.push(insight.sit.id);
  if (insight.subject?.id) ids.push(insight.subject.id);
  if (insight.competitor?.id) ids.push(insight.competitor.id);
  for (const alt of insight.alternatives ?? []) ids.push(alt.id);
  return ids;
}

export function useStartSitRecommendations(
  leagueId: string | undefined,
  isSynced: boolean,
  fallbackWeek = 1,
) {
  return useQuery({
    queryKey: ['priority-insights', leagueId, isSynced, fallbackWeek],
    queryFn: async (): Promise<PriorityInsight[]> => {
      const state = await fetchNflState();
      const week = resolveProjectionWeek(state, fallbackWeek);
      const season = resolveProjectionSeason(state);
      const projections = await fetchWeekProjections(season, week);

      if (isSynced && leagueId) {
        try {
          const res = await fetchMyTeamRoster(leagueId);
          const { starters, bench, rosterPositions } = res.roster;
          const rosterInsights = buildStartSitFromRoster({
            starters: starters.map((p) => ({
              id: p.id,
              name: p.name,
              pos: p.position,
              team: p.team,
              imageUrl: p.imageUrl,
            })),
            bench: bench.map((p) => ({
              id: p.id,
              name: p.name,
              pos: p.position,
              team: p.team,
              imageUrl: p.imageUrl,
            })),
            starterSlots: rosterPositions,
            projections,
          });

          if (rosterInsights.length > 0) {
            const mockDeck = buildMockPriorityInsights(projections);
            const variety = mockDeck.filter((m) => m.kind !== 'start_sit');
            const usedIds = new Set(rosterInsights.flatMap((r) => collectPlayerIds(r)));
            const extras = variety.filter(
              (m) => !collectPlayerIds(m).some((id) => usedIds.has(id)),
            );
            return [...rosterInsights, ...extras];
          }
        } catch {
          // Fall through to full mock deck.
        }
      }

      return buildMockPriorityInsights(projections);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
