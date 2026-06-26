import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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

/* ------------------------- Permission model ------------------------- */

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

/** True when fantasy actions should deep-link to the connected platform. */
export function isFantasyExternal(l: League | null | undefined) {
  return !!l && l.type === 'synced';
}

export function platformActionLabel(l: League | null | undefined, verb = 'Open') {
  if (!l || l.type !== 'synced') return verb;
  return `${verb} in ${l.platform}`;
}

interface AppContextValue {
  user: User | null;
  signIn: (u: User) => void;
  signOut: () => void;
  leagues: League[];
  active: League | null;
  setActiveId: (id: string) => void;
  addLeague: (l: League) => void;
  updateLeague: (id: string, patch: Partial<League>) => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'commissioner.v3';

interface Persisted {
  user: User | null;
  leagues: League[];
  activeId: string | null;
}

/* --------------------------- Demo data --------------------------- */

const DEMO_USER: User = {
  name: 'Marc Jackson',
  email: 'demo@commissioner.app',
  provider: 'apple',
};

const DEMO_LEAGUES: League[] = [
  {
    id: 'demo-1',
    name: 'Jackson Family League',
    shortName: 'JF',
    type: 'hosted',
    role: 'commissioner',
    stage: 'preseason',
    members: 12,
    size: 12,
    joined: 10,
    paid: 9,
    potUsd: 900,
    potCollected: 900,
    potTotal: 1200,
    buyIn: 100,
    platformFee: 5,
    scoring: 'Half PPR',
    draftType: 'Snake',
    draftSchedule: 'Sunday at 7:00 PM',
    week: 0,
    record: '0-0',
    rank: 0,
    teamName: 'Jackson Storm',
    paymentStatus: 'paid',
    paidCount: 9,
    unpaidCount: 2,
    pendingCount: 1,
  },
  {
    id: 'demo-2',
    name: 'Work League',
    shortName: 'WL',
    type: 'hosted',
    role: 'member',
    stage: 'regular',
    members: 12,
    size: 12,
    joined: 12,
    paid: 9,
    potUsd: 675,
    potCollected: 675,
    potTotal: 900,
    buyIn: 75,
    platformFee: 4,
    scoring: 'PPR',
    draftType: 'Snake',
    week: 7,
    record: '4-3',
    rank: 5,
    teamName: 'Office Gridiron',
    paymentStatus: 'unpaid',
    paidCount: 9,
    unpaidCount: 3,
    pendingCount: 0,
  },
  {
    id: 'demo-3',
    name: 'College Friends',
    shortName: 'CF',
    type: 'synced',
    platform: 'Sleeper',
    role: 'commissioner',
    stage: 'regular',
    members: 12,
    size: 12,
    joined: 12,
    paid: 12,
    potUsd: 1200,
    potCollected: 1200,
    potTotal: 1200,
    buyIn: 100,
    platformFee: 5,
    scoring: 'Half PPR',
    draftType: 'Snake',
    week: 7,
    record: '5-2',
    rank: 3,
    teamName: 'Campus Crushers',
    paymentStatus: 'paid',
    paidCount: 12,
    unpaidCount: 0,
    pendingCount: 0,
  },
  {
    id: 'demo-4',
    name: 'Dynasty League',
    shortName: 'DY',
    type: 'synced',
    platform: 'ESPN',
    role: 'member',
    stage: 'playoffs',
    members: 12,
    size: 12,
    joined: 12,
    paid: 12,
    potUsd: 1800,
    potCollected: 1800,
    potTotal: 1800,
    buyIn: 150,
    platformFee: 7,
    scoring: 'PPR',
    draftType: 'Snake',
    week: 15,
    record: '9-5',
    rank: 4,
    teamName: 'Legacy Lineup',
    paymentStatus: 'paid',
    paidCount: 12,
    unpaidCount: 0,
    pendingCount: 0,
  },
];

function defaultPersisted(): Persisted {
  return {
    user: DEMO_USER,
    leagues: DEMO_LEAGUES,
    activeId: DEMO_LEAGUES[0].id,
  };
}

function save(p: Persisted) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_USER);
  const [leagues, setLeagues] = useState<League[]>(DEMO_LEAGUES);
  const [activeId, setActiveIdState] = useState<string | null>(DEMO_LEAGUES[0].id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Persisted;
          if (parsed.user && parsed.leagues && parsed.leagues.length > 0) {
            setUser(parsed.user);
            setLeagues(parsed.leagues);
            setActiveIdState(parsed.activeId ?? parsed.leagues[0]?.id ?? null);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    save({ user, leagues, activeId });
  }, [user, leagues, activeId, hydrated]);

  const value = useMemo<AppContextValue>(() => {
    const active = leagues.find((l) => l.id === activeId) ?? leagues[0] ?? null;
    return {
      user,
      signIn: (u) => setUser(u),
      signOut: () => {
        setUser(DEMO_USER);
        setLeagues(DEMO_LEAGUES);
        setActiveIdState(DEMO_LEAGUES[0].id);
      },
      leagues,
      active,
      setActiveId: (id) => setActiveIdState(id),
      addLeague: (l) => {
        setLeagues((prev) => [...prev, l]);
        setActiveIdState(l.id);
      },
      updateLeague: (id, patch) =>
        setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
      can: (p) => can(active, p),
    };
  }, [user, leagues, activeId]);

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
