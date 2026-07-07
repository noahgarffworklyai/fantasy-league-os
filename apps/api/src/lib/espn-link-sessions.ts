import type { LeagueSummary } from '@flos/shared';
import { randomBytes } from 'node:crypto';

export type EspnLinkSession = {
  userId: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  espnS2?: string;
  swid?: string;
  leagues?: LeagueSummary[];
  error?: string;
};

const TTL_MS = 15 * 60 * 1000;
const sessions = new Map<string, EspnLinkSession>();

function prune() {
  const now = Date.now();
  for (const [code, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(code);
  }
}

export function createEspnLinkSession(userId: string) {
  prune();
  const code = randomBytes(16).toString('hex');
  const session: EspnLinkSession = {
    userId,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  };
  sessions.set(code, session);
  return session;
}

export function getEspnLinkSession(code: string) {
  prune();
  const session = sessions.get(code);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(code);
    return null;
  }
  return session;
}

export function completeEspnLinkSession(
  code: string,
  data: { espnS2: string; swid: string; leagues: LeagueSummary[] },
) {
  const session = getEspnLinkSession(code);
  if (!session) return null;
  session.espnS2 = data.espnS2;
  session.swid = data.swid;
  session.leagues = data.leagues;
  session.error = undefined;
  return session;
}

export function failEspnLinkSession(code: string, error: string) {
  const session = getEspnLinkSession(code);
  if (!session) return null;
  session.error = error;
  return session;
}
