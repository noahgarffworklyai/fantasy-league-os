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

export async function scheduleLeagueSync(linkId: string) {
  const { Queue } = await import('bullmq');
  const queue = new Queue(SYNC_QUEUE, { connection: bullConnection });
  await queue.add('sync', { linkId }, { removeOnComplete: 100, removeOnFail: 50 });
  await queue.close();
}

export async function scheduleAllLeagueSyncs() {
  const links = await db.select({ id: leagueProviderLinks.id }).from(leagueProviderLinks);
  for (const link of links) {
    await scheduleLeagueSync(link.id);
  }
}

export function startPeriodicSync(intervalMs = 10 * 60 * 1000) {
  setInterval(() => {
    scheduleAllLeagueSyncs().catch(console.error);
  }, intervalMs);
}
