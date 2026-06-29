import { sleeperPlayerImageUrl, sleeperUserAvatarUrl } from '@flos/shared';

// Use `personAvatar` for users/managers and `playerAvatar` for athletes.

export function personAvatar(seed: string, avatarRef?: string | null): string {
  if (avatarRef) {
    if (avatarRef.startsWith('http://') || avatarRef.startsWith('https://')) return avatarRef;
    const url = sleeperUserAvatarUrl(avatarRef);
    if (url) return url;
  }
  return `https://i.pravatar.cc/120?u=${encodeURIComponent(seed)}`;
}

/** Sleeper player id when known; otherwise falls back to a deterministic placeholder. */
export function playerAvatar(input: string | { playerId?: string; name?: string; team?: string; imageUrl?: string }): string {
  if (typeof input === 'object') {
    if (input.imageUrl) return input.imageUrl;
    if (input.playerId) return sleeperPlayerImageUrl(input.playerId);
    const seed = `${input.name ?? ''}${input.team ?? ''}`.trim();
    return dicebearPlayer(seed || 'player');
  }

  if (/^\d+$/.test(input) || /^[A-Z]{2,4}$/.test(input)) {
    return sleeperPlayerImageUrl(input);
  }

  return dicebearPlayer(input);
}

function dicebearPlayer(seed: string): string {
  return `https://api.dicebear.com/9.x/personas/png?seed=${encodeURIComponent(
    seed,
  )}&radius=50&backgroundType=gradientLinear`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export { sleeperPlayerImageUrl, sleeperUserAvatarUrl };
