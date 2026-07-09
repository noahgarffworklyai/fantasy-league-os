import { CommissionerInsightsCard } from '@/components/player/CommissionerInsightsCard';
import type { PlayerInsights } from '@/lib/player-outlook';

/** @deprecated use CommissionerInsightsCard */
export function PlayerFantasyOutlook({
  outlook,
}: {
  outlook: PlayerInsights;
  title?: string;
}) {
  return <CommissionerInsightsCard paragraphs={outlook.paragraphs} bullets={outlook.bullets} />;
}
