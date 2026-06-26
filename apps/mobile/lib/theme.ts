export const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
