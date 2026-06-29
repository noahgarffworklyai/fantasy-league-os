/** Sleeper CDN URL for an NFL player headshot (or team logo for DEF ids). */
export function sleeperPlayerImageUrl(playerId: string, size: 'thumb' | 'full' = 'thumb'): string {
  const id = playerId.trim();
  if (/^[A-Z]{2,4}$/.test(id)) {
    return `https://sleepercdn.com/images/team_logos/nfl/${id.toLowerCase()}.png`;
  }
  if (size === 'thumb') {
    return `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  }
  return `https://sleepercdn.com/content/nfl/players/${id}.jpg`;
}

/** Sleeper CDN URL for a user's profile avatar. */
export function sleeperUserAvatarUrl(avatarId: string, thumb = true): string {
  const id = avatarId.trim();
  if (!id) return '';
  if (id.startsWith('http://') || id.startsWith('https://')) return id;
  return thumb
    ? `https://sleepercdn.com/avatars/thumbs/${id}`
    : `https://sleepercdn.com/avatars/${id}`;
}
