import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { importRoutes } from './routes/imports.js';
import { leagueRoutes } from './routes/leagues.js';
import { inviteRoutes } from './routes/invites.js';
import { treasuryRoutes } from './routes/treasury.js';
import { webhookRoutes } from './routes/webhooks.js';
import { engagementRoutes } from './routes/engagement.js';
import { aiRoutes } from './routes/ai.js';
import { paymentRoutes } from './routes/payments.js';
import { yahooAuthRoutes } from './routes/yahoo-auth.js';
import { playerRoutes } from './routes/players.js';
import { startPeriodicSync, startSyncWorker } from './services/sync-worker.js';

const app = Fastify({
  logger: true,
});

app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    if (req.url === '/webhooks/stripe') {
      (req as { rawBody?: Buffer }).rawBody = body as Buffer;
    }
    const json = JSON.parse((body as Buffer).toString());
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

await app.register(cors, { origin: true });

app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  service: 'fantasy-league-os-api',
}));

await app.register(authRoutes);
await app.register(importRoutes);
await app.register(leagueRoutes);
await app.register(inviteRoutes);
await app.register(treasuryRoutes);
await app.register(paymentRoutes);
await app.register(webhookRoutes);
await app.register(engagementRoutes);
await app.register(aiRoutes);
await app.register(yahooAuthRoutes);
await app.register(playerRoutes);

try {
  startSyncWorker();
  startPeriodicSync();
} catch (err) {
  app.log.warn('Sync worker not started (Redis may be unavailable): %s', err);
}

app.listen({ port: config.port, host: config.host }).then((address) => {
  app.log.info(`API listening at ${address}`);
});
