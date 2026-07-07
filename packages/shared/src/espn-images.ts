/** ESPN CDN headshot for an NFL player (ESPN athlete id). */
export function espnPlayerImageUrl(playerId: string | number): string {
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`;
}
