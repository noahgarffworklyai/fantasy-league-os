// Mock avatar helpers. Returns deterministic image URLs for a given seed.
// Use `personAvatar` for users/managers and `playerAvatar` for athletes.

export function personAvatar(seed: string): string {
  return `https://i.pravatar.cc/120?u=${encodeURIComponent(seed)}`;
}

export function playerAvatar(seed: string): string {
  // PNG endpoint (RN <Image> cannot render remote SVG reliably).
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
