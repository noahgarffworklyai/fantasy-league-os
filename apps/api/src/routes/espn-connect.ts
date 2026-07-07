import { discoverEspnLeagues } from '@flos/league-adapters';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authMiddleware, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import {
  completeEspnLinkSession,
  createEspnLinkSession,
  failEspnLinkSession,
  getEspnLinkSession,
} from '../lib/espn-link-sessions.js';

const APP_SCHEME = 'fantasyleagueos://espn-connected';

function connectPageHtml(code: string, apiOrigin: string, error?: string) {
  const errBlock = error
    ? `<p style="color:#b91c1c;background:#fef2f2;padding:12px;border-radius:12px;">${error}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect ESPN</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 24px; background: #f5f5f5; color: #111; }
    .card { background: #fff; border-radius: 16px; padding: 20px; max-width: 420px; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    h1 { font-size: 22px; margin: 0 0 8px; }
    p, li { font-size: 15px; line-height: 1.5; color: #444; }
    label { display: block; font-size: 13px; font-weight: 600; margin: 16px 0 6px; }
    input { width: 100%; box-sizing: border-box; height: 48px; border-radius: 12px; border: 1px solid #ddd; padding: 0 14px; font-size: 16px; }
    button, .btn { display: block; width: 100%; margin-top: 16px; height: 48px; border: 0; border-radius: 12px; background: #111; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; line-height: 48px; text-align: center; }
    .secondary { background: #eee; color: #111; margin-top: 10px; }
    ol { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connect ESPN</h1>
    <p>Paste your ESPN session cookies so the app can sync your league.</p>
    ${errBlock}
    <ol>
      <li><a href="https://www.espn.com/login?redirect=https%3A%2F%2Ffantasy.espn.com%2Ffootball">Sign in to ESPN</a> (opens in this browser)</li>
      <li>On a computer: DevTools → Application → Cookies → espn.com</li>
      <li>Copy <strong>espn_s2</strong> and <strong>SWID</strong> below</li>
    </ol>
    <form method="post" action="${apiOrigin}/espn/connect/${code}">
      <label for="espnS2">espn_s2</label>
      <input id="espnS2" name="espnS2" required autocomplete="off" />
      <label for="swid">SWID</label>
      <input id="swid" name="swid" required autocomplete="off" placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}" />
      <button type="submit">Find my leagues</button>
    </form>
    <a class="btn secondary" href="${APP_SCHEME}?code=${code}&cancel=1">Return to app</a>
  </div>
</body>
</html>`;
}

function successPageHtml(code: string, leagueCount: number) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ESPN connected</title>
  <meta http-equiv="refresh" content="1;url=${APP_SCHEME}?code=${code}&ok=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f5f5f5; }
    .card { background:#fff; border-radius:16px; padding:24px; text-align:center; max-width:360px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connected</h1>
    <p>Found ${leagueCount} league${leagueCount === 1 ? '' : 's'}. Returning to the app…</p>
    <a href="${APP_SCHEME}?code=${code}&ok=1">Open app</a>
  </div>
  <script>setTimeout(function(){ window.location.href = '${APP_SCHEME}?code=${code}&ok=1'; }, 500);</script>
</body>
</html>`;
}

export async function espnConnectRoutes(app: FastifyInstance) {
  app.post('/imports/espn/link-session', { preHandler: authMiddleware }, async (request) => {
    const { userId } = request as AuthenticatedRequest;
    const session = createEspnLinkSession(userId);
    const proto = request.headers['x-forwarded-proto'] ?? 'http';
    const host = request.headers['x-forwarded-host'] ?? request.headers.host ?? 'localhost:3000';
    const origin = `${proto}://${host}`;
    return {
      code: session.code,
      connectUrl: `${origin}/espn/connect/${session.code}`,
    };
  });

  app.get('/imports/espn/link-session/:code', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { code } = z.object({ code: z.string().min(8) }).parse(request.params);
    const session = getEspnLinkSession(code);
    if (!session || session.userId !== userId) {
      return reply.status(404).send({ error: 'Session not found or expired' });
    }
    return {
      ready: Boolean(session.leagues?.length && session.espnS2 && session.swid),
      error: session.error,
      espnS2: session.espnS2,
      swid: session.swid,
      leagues: session.leagues ?? [],
    };
  });

  app.get('/espn/connect/:code', async (request, reply) => {
    const { code } = z.object({ code: z.string().min(8) }).parse(request.params);
    const session = getEspnLinkSession(code);
    if (!session) {
      return reply.status(404).type('text/html').send('<h1>Link expired</h1><p>Return to the app and try again.</p>');
    }
    const proto = request.headers['x-forwarded-proto'] ?? 'http';
    const host = request.headers['x-forwarded-host'] ?? request.headers.host ?? 'localhost:3000';
    const origin = `${proto}://${host}`;
    return reply.type('text/html').send(connectPageHtml(code, origin));
  });

  app.post('/espn/connect/:code', async (request, reply) => {
    const { code } = z.object({ code: z.string().min(8) }).parse(request.params);
    const session = getEspnLinkSession(code);
    if (!session) {
      return reply.status(404).type('text/html').send('<h1>Link expired</h1>');
    }

    const body = z
      .object({
        espnS2: z.string().min(1),
        swid: z.string().min(1),
      })
      .parse(request.body);

    const proto = request.headers['x-forwarded-proto'] ?? 'http';
    const host = request.headers['x-forwarded-host'] ?? request.headers.host ?? 'localhost:3000';
    const origin = `${proto}://${host}`;

    try {
      const leagues = await discoverEspnLeagues(
        { espnS2: body.espnS2.trim(), swid: body.swid.trim() },
      );
      if (leagues.length === 0) {
        failEspnLinkSession(code, 'No leagues found for this ESPN account.');
        return reply
          .type('text/html')
          .send(connectPageHtml(code, origin, 'No leagues found. Check your cookies and try again.'));
      }
      completeEspnLinkSession(code, {
        espnS2: body.espnS2.trim(),
        swid: body.swid.trim(),
        leagues,
      });
      return reply.type('text/html').send(successPageHtml(code, leagues.length));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect ESPN';
      failEspnLinkSession(code, message);
      return reply.type('text/html').send(connectPageHtml(code, origin, message));
    }
  });
}
