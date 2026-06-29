import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import type { LeagueInviteLink } from './league-api';

const INVITE_WEB_URL =
  process.env.EXPO_PUBLIC_INVITE_WEB_URL ??
  (Constants.expoConfig?.extra?.inviteWebUrl as string | undefined);

export type InviteShareContent = LeagueInviteLink & {
  joinCode: string;
  shareMessage: string;
  usingLocalDev: boolean;
};

function isLocalHostUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function isDevExpoLink(url: string) {
  return url.startsWith('exp://') || url.includes('127.0.0.1') || url.includes('localhost');
}

/** Build invite fields that are safe to share outside the dev machine. */
export function buildInviteShareContent(
  links: LeagueInviteLink,
  leagueName: string,
): InviteShareContent {
  const joinCode = links.token;
  const deepLink = links.deepLink || Linking.createURL(`invite/${joinCode}`);

  const configuredWebLink = INVITE_WEB_URL
    ? `${INVITE_WEB_URL.replace(/\/$/, '')}/invite/${joinCode}`
    : null;

  const webLink =
    configuredWebLink ??
    (!isLocalHostUrl(links.webLink) ? links.webLink : deepLink);

  const usingLocalDev = !configuredWebLink && (isLocalHostUrl(links.webLink) || isDevExpoLink(deepLink));

  const lines = [
    `Join ${leagueName} on Fantasy League OS`,
    '',
    `Join code: ${joinCode}`,
    '',
    'In the app: Join a League → paste the code above.',
  ];

  if (!usingLocalDev && webLink !== deepLink) {
    lines.push('', `Or open: ${webLink}`);
  } else if (!isDevExpoLink(deepLink)) {
    lines.push('', `App link: ${deepLink}`);
  }

  return {
    ...links,
    joinCode,
    deepLink,
    webLink,
    usingLocalDev,
    shareMessage: lines.join('\n'),
  };
}
