import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LeagueListItem, User as ApiUser } from '@flos/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuthStore } from './auth-store';
import {
  createHostedLeagueOnApi,
  fetchLeaguesFromApi,
  type CreateHostedLeagueInput,
} from './league-api';

export type LeagueType = 'hosted' | 'synced';
export type SyncPlatform = 'ESPN' | 'Sleeper' | 'Yahoo';
export type UserRole = 'commissioner' | 'member';
export type SeasonStage = 'preseason' | 'draft' | 'regular' | 'playoffs' | 'offseason';

export type PaymentStatus =
  | 'paid'
  | 'unpaid'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'overdue';

export interface League {
  id: string;
  name: string;
  shortName: string;
  type: LeagueType;
  platform?: SyncPlatform;
  role: UserRole;
  stage: SeasonStage;
  members: number;
  potUsd: number;
  week: number;
  record: string;
  rank: number;
  size?: number;
  scoring?: 'Standard' | 'Half PPR' | 'PPR';
  buyIn?: number;
  draftDate?: string;
  draftType?: 'Snake' | 'Auction';
  joined?: number;
  paid?: number;
  ready?: boolean;
  teamName?: string;
  paymentStatus?: PaymentStatus;
  platformFee?: number;
  potCollected?: number;
  potTotal?: number;
  paidCount?: number;
  unpaidCount?: number;
  pendingCount?: number;
  draftSchedule?: string;
}

export type AuthProvider = 'apple' | 'google' | 'email';
export interface User {
  name: string;
  email: string;
  provider: AuthProvider;
}

export type Permission =
  | 'manageTeam'
  | 'setLineup'
  | 'submitWaiver'
  | 'proposeTrade'
  | 'acceptTrade'
  | 'payDues'
  | 'viewReports'
  | 'comment'
  | 'createPoll'
  | 'createAnnouncement'
  | 'inviteMembers'
  | 'editLeagueSettings'
  | 'manageTreasury'
  | 'reviewPayouts'
  | 'scheduleDraft'
  | 'manageDraftSetup'
  | 'sendPaymentReminders'
  | 'refreshSync';

const PROVIDER_LABEL: Record<string, SyncPlatform> = {
  sleeper: 'Sleeper',
  espn: 'ESPN',
  yahoo: 'Yahoo',
};

const ACTIVE_ID_KEY = 'commissioner.activeLeagueId';

function stageForWeek(week: number): SeasonStage {
  if (week <= 0) return 'preseason';
  if (week >= 15) return 'playoffs';
  return 'regular';
}

export function mapApiUser(user: ApiUser): User {
  return {
    name: user.displayName,
    email: user.email,
    provider: 'email',
  };
}

export function mapApiLeague(row: LeagueListItem): League {
  const provider = row.provider ? PROVIDER_LABEL[row.provider] : undefined;
  const type = provider ? 'synced' : 'hosted';
  const role: UserRole = row.role === 'commissioner' ? 'commissioner' : 'member';
  const week = row.currentWeek ?? 0;
  const buyIn = Math.round(row.buyInCents / 100);
  const members = row.memberCount || 1;

  return {
    id: row.id,
    name: row.name,
    shortName: shortNameFor(row.name),
    type,
    platform: provider,
    role,
    stage: stageForWeek(week),
    members,
    size: members,
    joined: members,
    potUsd: buyIn * members,
    buyIn,
    platformFee: Math.round(row.platformFeeCents / 100),
    week,
    record: week > 0 ? '0-0' : '—',
    rank: 0,
    teamName: row.teamName ?? undefined,
    paymentStatus: row.paid ? 'paid' : 'unpaid',
    paid: row.paid ? 1 : 0,
  };
}

export function permissionsFor(l: League): Set<Permission> {
  const set = new Set<Permission>([
    'manageTeam',
    'setLineup',
    'submitWaiver',
    'proposeTrade',
    'acceptTrade',
    'payDues',
    'viewReports',
    'comment',
  ]);
  if (l.role === 'commissioner') {
    set.add('inviteMembers');
    set.add('editLeagueSettings');
    set.add('manageTreasury');
    set.add('reviewPayouts');
    set.add('scheduleDraft');
    set.add('manageDraftSetup');
    set.add('createPoll');
    set.add('createAnnouncement');
    set.add('sendPaymentReminders');
  }
  if (l.type === 'synced' && l.role === 'commissioner') {
    set.add('refreshSync');
  }
  return set;
}

export function can(l: League | null | undefined, p: Permission) {
  if (!l) return false;
  return permissionsFor(l).has(p);
}

export function isFantasyExternal(l: League | null | undefined) {
  return !!l && l.type === 'synced';
}

export function platformActionLabel(l: League | null | undefined, verb = 'Open') {
  if (!l || l.type !== 'synced') return verb;
  return `${verb} in ${l.platform}`;
}

interface AppContextValue {
  user: User | null;
  authInitialized: boolean;
  leaguesLoading: boolean;
  signOut: () => Promise<void>;
  leagues: League[];
  active: League | null;
  setActiveId: (id: string) => void;
  refreshLeagues: () => Promise<League[]>;
  createHostedLeague: (input: CreateHostedLeagueInput) => Promise<League>;
  addLeague: (l: League) => void;
  updateLeague: (id: string, patch: Partial<League>) => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AppContextValue | null>(null);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const apiUser = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const authLogout = useAuthStore((s) => s.logout);
  const authInitialize = useAuthStore((s) => s.initialize);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const user = apiUser ? mapApiUser(apiUser) : null;

  useEffect(() => {
    authInitialize().catch(() => {});
  }, [authInitialize]);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_ID_KEY)
      .then((id) => {
        if (id) setActiveIdState(id);
      })
      .finally(() => setHydrated(true));
  }, []);

  const refreshLeagues = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      setLeagues([]);
      return [];
    }
    setLeaguesLoading(true);
    try {
      const rows = await fetchLeaguesFromApi();
      const mapped = rows.map(mapApiLeague);
      setLeagues(mapped);
      setActiveIdState((current) => {
        if (mapped.length === 0) return null;
        if (current && mapped.some((l) => l.id === current)) return current;
        return mapped[0].id;
      });
      return mapped;
    } finally {
      setLeaguesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authInitialized || !hydrated) return;
    if (apiUser) {
      setLeaguesLoading(true);
      refreshLeagues().catch(() => setLeagues([]));
    } else {
      setLeagues([]);
      setActiveIdState(null);
      setLeaguesLoading(false);
    }
  }, [apiUser, authInitialized, hydrated, refreshLeagues]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeId) AsyncStorage.setItem(ACTIVE_ID_KEY, activeId).catch(() => {});
    else AsyncStorage.removeItem(ACTIVE_ID_KEY).catch(() => {});
  }, [activeId, hydrated]);

  const value = useMemo<AppContextValue>(() => {
    const active = leagues.find((l) => l.id === activeId) ?? leagues[0] ?? null;
    return {
      user,
      authInitialized,
      leaguesLoading,
      signOut: async () => {
        await authLogout();
        setLeagues([]);
        setActiveIdState(null);
      },
      leagues,
      active,
      setActiveId: (id) => setActiveIdState(id),
      refreshLeagues,
      createHostedLeague: async (input) => {
        const res = await createHostedLeagueOnApi(input);
        await refreshLeagues();
        setActiveIdState(res.league.id);
        const created = mapApiLeague({
          id: res.league.id,
          name: res.league.name,
          season: new Date().getFullYear(),
          role: 'commissioner',
          paid: true,
          buyInCents: res.league.buyInCents,
          platformFeeCents: res.league.platformFeeCents,
          memberCount: 1,
          provider: null,
          currentWeek: 0,
          teamName: null,
        });
        return {
          ...created,
          size: input.size,
          members: input.size,
          scoring: input.scoring as League['scoring'],
          draftType: input.draftType as League['draftType'],
          draftDate: input.draftDate,
          joined: 1,
          ready: false,
        };
      },
      addLeague: (l) => {
        setLeagues((prev) => [...prev.filter((x) => x.id !== l.id), l]);
        setActiveIdState(l.id);
      },
      updateLeague: (id, patch) =>
        setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
      can: (p) => can(active, p),
    };
  }, [
    user,
    authInitialized,
    leaguesLoading,
    authLogout,
    leagues,
    activeId,
    refreshLeagues,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeague() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}

export function stageLabel(s: SeasonStage) {
  return (
    {
      preseason: 'Preseason',
      draft: 'Draft',
      regular: 'Regular Season',
      playoffs: 'Playoffs',
      offseason: 'Offseason',
    } as const
  )[s];
}

export function roleLabel(r: UserRole) {
  return r === 'commissioner' ? 'Commissioner' : 'Member';
}

export function leagueSubtitle(l: League) {
  const parts: string[] = [l.type === 'synced' ? 'Synced' : 'Hosted', roleLabel(l.role)];
  if (l.type === 'synced' && l.platform) parts.push(l.platform);
  parts.push(stageLabel(l.stage));
  return parts.join(' • ');
}

export function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function shortNameFor(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'LG'
  );
}
