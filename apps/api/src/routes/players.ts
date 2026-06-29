import {
  buildLeaguePlayerSearch,
  fetchLeagueOwnedPlayerIds,
  getSleeperPlayer,
  type PlayerSearchRow,
} from '@flos/league-adapters';
import { sleeperPlayerImageUrl } from '@flos/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueProviderLinks } from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';

function mapPlayerDetail(player: NonNullable<Awaited<ReturnType<typeof getSleeperPlayer>>>) {
  const name =
    player.full_name?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(' ').trim() ||
    `Player ${player.player_id}`;

  return {
    id: player.player_id,
    name,
    position: player.position ?? 'FLEX',
    team: player.team ?? 'FA',
    status: player.status ?? 'Active',
    injuryStatus: player.injury_status ?? null,
    number: player.number ?? null,
    age: player.age ?? null,
    yearsExp: player.years_exp ?? null,
    fantasyPositions: player.fantasy_positions ?? [],
    imageUrl: sleeperPlayerImageUrl(player.player_id),
  };
}

export async function playerRoutes(app: FastifyInstance) {
  app.get('/leagues/:id/player-search', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { search, position, tab, limit } = request.query as {
      search?: string;
      position?: string;
      tab?: 'all' | 'available' | 'injured' | 'trending';
      limit?: string;
    };

    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    try {
      const players = await buildLeaguePlayerSearch({
        externalLeagueId: link?.provider === 'sleeper' ? link.externalLeagueId : undefined,
        query: search,
        position,
        tab: tab ?? (search ? undefined : 'all'),
        limit: limit ? Number(limit) : undefined,
      });
      return { players, source: link?.provider ?? 'sleeper' };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to search players',
      });
    }
  });

  app.get('/leagues/:id/players', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { search, position } = request.query as { search?: string; position?: string };

    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    try {
      const players = await buildLeaguePlayerSearch({
        externalLeagueId: link?.provider === 'sleeper' ? link.externalLeagueId : undefined,
        query: search,
        position,
        limit: 50,
      });
      return { players };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to load players',
      });
    }
  });

  app.get('/players/:playerId', { preHandler: authMiddleware }, async (request, reply) => {
    const { playerId } = request.params as { playerId: string };
    const { leagueId } = request.query as { leagueId?: string };

    try {
      const player = await getSleeperPlayer(playerId);
      if (!player) {
        return reply.status(404).send({ error: 'Player not found' });
      }

      let owned = false;
      let ownership = 0;
      let available = 100;

      if (leagueId) {
        try {
          await requireLeagueMembership(request as AuthenticatedRequest, leagueId);
          const [link] = await db
            .select()
            .from(leagueProviderLinks)
            .where(eq(leagueProviderLinks.leagueId, leagueId))
            .limit(1);
          if (link?.provider === 'sleeper') {
            const { ownedIds, teamCount } = await fetchLeagueOwnedPlayerIds(link.externalLeagueId);
            owned = ownedIds.has(playerId);
            ownership = owned ? 100 : 0;
            available = owned ? 0 : 100;
          }
        } catch {
          // ignore league context errors for player detail
        }
      }

      return {
        player: {
          ...mapPlayerDetail(player),
          owned,
          ownership,
          available,
        },
      };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to load player',
      });
    }
  });
}

export type { PlayerSearchRow };
