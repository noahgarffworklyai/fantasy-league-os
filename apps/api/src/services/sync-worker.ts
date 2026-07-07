import { Worker, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { leagueProviderLinks } from '../db/schema.js';
import { syncLeagueProviderLink } from './sync.js';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const bullConnection = connection as unknown as ConnectionOptions;

export const SYNC_QUEUE = 'league-sync';

export function startSyncWorker() {
  const worker = new Worker(
    SYNC_QUEUE,
    async (job) => {
      const { linkId } = job.data as { linkId: string };
      await syncLeagueProviderLink(linkId);
    },
    { connection: bullConnection },
  );

  worker.on('failed', (job, err) => {
    console.error(`Sync job ${job?.id} failed:`, err.message);
  });

  return worker;
}

const SCHEDULE_TIMEOUT_MS = 3_000;

export async function scheduleLeagueSync(linkId: string) {
  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue(SYNC_QUEUE, { connection: bullConnection });
    await Promise.race([
      queue.add('sync', { linkId }, { removeOnComplete: 100, removeOnFail: 50 }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis unavailable')), SCHEDULE_TIMEOUT_MS);
      }),
    ]);
    await queue.close();
  } catch (err) {
    console.warn(
      'Background sync queue unavailable:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function scheduleAllLeagueSyncs() {
  const links = await db.select().from(leagueProviderLinks);
  for (const link of links) {
    if (shouldRefreshSync(link)) {
      await scheduleLeagueSync(link.id);
    }
  }
}

/** Stale snapshot refresh interval (default 10 min). */
export const SYNC_STALE_MS = 10 * 60 * 1000;
/** Retry sooner after a failed sync (default 2 min). */
export const SYNC_RETRY_MS = 2 * 60 * 1000;

export function shouldRefreshSync(link: {
  lastSyncedAt: Date | null;
  syncStatus: string | null;
}): boolean {
  const last = link.lastSyncedAt?.getTime() ?? 0;
  const ageMs = Date.now() - last;
  if (link.syncStatus === 'error' || link.syncStatus === 'pending') {
    return ageMs >= SYNC_RETRY_MS;
  }
  return ageMs >= SYNC_STALE_MS;
}

/** Queue a background sync when the snapshot is stale or previously failed. */
export async function maybeScheduleLeagueSync(link: {
  id: string;
  lastSyncedAt: Date | null;
  syncStatus: string | null;
}): Promise<boolean> {
  if (!shouldRefreshSync(link)) return false;
  await scheduleLeagueSync(link.id);
  return true;
}

export function startPeriodicSync(intervalMs = SYNC_STALE_MS) {
  scheduleAllLeagueSyncs().catch(console.error);
  setInterval(() => {
    scheduleAllLeagueSyncs().catch(console.error);
  }, intervalMs);
}
