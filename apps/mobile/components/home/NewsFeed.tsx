import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ChevronLeft,
  MoreHorizontal,
  Newspaper,
  RefreshCw,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

type NewsCategory = 'top' | 'fantasy' | 'injuries' | 'transactions';

type NewsArticle = {
  id: string;
  categories: NewsCategory[];
  source: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  publishedAgo: string;
  featured?: boolean;
  thumbnailLabel: string;
  thumbnailTone: 'neutral' | 'success' | 'warning' | 'danger';
};

const CATEGORY_TABS: { key: NewsCategory; label: string; icon: LucideIcon }[] = [
  { key: 'top', label: 'Top', icon: Newspaper },
  { key: 'fantasy', label: 'Fantasy', icon: Trophy },
  { key: 'injuries', label: 'Injuries', icon: Activity },
  { key: 'transactions', label: 'Moves', icon: RefreshCw },
];

const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: 'n1',
    categories: ['top', 'fantasy'],
    source: 'ESPN',
    title: 'Week 12 fantasy rankings: Start Jayden Daniels, sit Brock Purdy in tough matchups',
    excerpt: 'Quarterback streaming targets and sit/start calls for every fantasy roster.',
    body: 'Daniels draws a plus matchup against a bottom-five pass defense while Purdy faces the league\'s top turnover unit. Fantasy managers with both should lean into the Commanders signal-caller for ceiling weeks down the stretch.\n\nRunning back usage notes, wide receiver target trends, and tight end streamers are updated after Wednesday practice reports.',
    author: 'Field Yates',
    publishedAgo: '1h ago',
    featured: true,
    thumbnailLabel: 'QB',
    thumbnailTone: 'success',
  },
  {
    id: 'n2',
    categories: ['top', 'injuries'],
    source: 'The Athletic',
    title: 'Saquon Barkley limited in practice with ankle issue, expected to play Sunday',
    excerpt: 'Eagles back was a full participant Thursday after a cautious Wednesday.',
    body: 'Barkley told reporters he feels "good enough to go" and coaches echoed optimism. Monitor Friday\'s injury report for official game status, but early indicators point to a normal workload.',
    author: 'Garrett Downs',
    publishedAgo: '2h ago',
    thumbnailLabel: 'RB',
    thumbnailTone: 'warning',
  },
  {
    id: 'n3',
    categories: ['top', 'transactions'],
    source: 'NFL Network',
    title: 'Chiefs trade for veteran WR depth ahead of playoff push',
    excerpt: 'Kansas City adds a red-zone target to support Travis Kelce and Rashee Rice.',
    body: 'The move signals confidence in a deep January run and gives Patrick Mahomes another contested-catch option on third down. Fantasy managers should expect a slight target dip for secondary receivers over the next two weeks.',
    author: 'Tom Pelissero',
    publishedAgo: '3h ago',
    thumbnailLabel: 'KC',
    thumbnailTone: 'neutral',
  },
  {
    id: 'n4',
    categories: ['fantasy'],
    source: 'FantasyPros',
    title: 'Waiver wire priorities: Tank Bigsby tops list with Etienne questionable',
    excerpt: 'Handcuffs and breakout wideouts to stash before Sunday\'s games.',
    body: 'Bigsby handled 17 carries last week and could see a workhorse role if Trevor Etienne sits. Add now before waivers process overnight.',
    author: 'Chris Harris',
    publishedAgo: '4h ago',
    thumbnailLabel: 'JAX',
    thumbnailTone: 'success',
  },
  {
    id: 'n5',
    categories: ['fantasy'],
    source: 'Rotoworld',
    title: 'Odunze\'s target share climbs as Chicago leans on rookie WR in playoff hunt',
    excerpt: 'Three straight games with 8+ targets for the second-year wideout.',
    body: 'With DJ Moore drawing bracket coverage, Odunze has become Caleb Williams\'s safety valve on intermediate routes. Flex upside remains strong in PPR formats.',
    author: 'Rotoworld Staff',
    publishedAgo: '5h ago',
    thumbnailLabel: 'CHI',
    thumbnailTone: 'neutral',
  },
  {
    id: 'n6',
    categories: ['injuries'],
    source: 'Pro Football Talk',
    title: 'Travis Kelce listed questionable with knee soreness',
    excerpt: 'Chiefs TE expected to play but may see reduced snap count.',
    body: 'Kelce participated in a limited fashion Wednesday and Thursday. Fantasy managers should have a backup tight end rostered but can likely still start him in most formats.',
    author: 'Michael David Smith',
    publishedAgo: '6h ago',
    thumbnailLabel: 'TE',
    thumbnailTone: 'warning',
  },
  {
    id: 'n7',
    categories: ['injuries'],
    source: 'ESPN',
    title: 'Chris Olave in concussion protocol, status doubtful for Week 12',
    excerpt: 'Saints wideout did not practice Wednesday or Thursday.',
    body: 'Olave must clear protocol before returning. Rashid Shaheed and secondary options gain value if Olave is ruled out.',
    author: 'Adam Schefter',
    publishedAgo: '7h ago',
    thumbnailLabel: 'NO',
    thumbnailTone: 'danger',
  },
  {
    id: 'n8',
    categories: ['transactions'],
    source: 'Bleacher Report',
    title: 'Steelers sign free-agent CB to bolster secondary before divisional stretch',
    excerpt: 'Pittsburgh adds depth with three straight games against top-10 passing offenses.',
    body: 'The signing is primarily defensive but could slightly boost Steelers DST streaming appeal in weeks 12–14.',
    author: 'B/R Staff',
    publishedAgo: '8h ago',
    thumbnailLabel: 'PIT',
    thumbnailTone: 'neutral',
  },
  {
    id: 'n9',
    categories: ['transactions', 'top'],
    source: 'CNBC',
    title: 'Cowboys-Eagles Sunday night matchup carries massive fantasy implications',
    excerpt: 'Two NFC East rivals collide with playoff seeding on the line.',
    body: 'Stacking this game in DFS and prioritizing pass-catchers in season-long leagues makes sense given the implied team totals. Monitor inactives before kickoff.',
    author: 'CNBC Sports',
    publishedAgo: '9h ago',
    thumbnailLabel: 'SNF',
    thumbnailTone: 'success',
  },
];

function Thumbnail({
  label,
  tone,
  large,
}: {
  label: string;
  tone: NewsArticle['thumbnailTone'];
  large?: boolean;
}) {
  const { hex, toneBg } = useThemeTokens();
  const size = large ? { width: '100%' as const, height: 180 } : { width: 72, height: 72 };
  return (
    <View
      style={[
        {
          borderRadius: large ? 0 : 12,
          backgroundColor: toneBg[tone],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        size,
      ]}
    >
      <Text variant="eyebrow" style={{ color: hex.foreground, letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function CategoryBubbles({
  value,
  onChange,
}: {
  value: NewsCategory;
  onChange: (k: NewsCategory) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const c = useColors();

  return (
    <View style={[layout.row, { width: '100%', gap: 6 }]}>
      {CATEGORY_TABS.map((tab) => {
        const active = tab.key === value;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              layout.row,
              surfaces.pill,
              layout.flex1,
              {
                gap: 4,
                minWidth: 0,
                paddingHorizontal: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active
                  ? hex.foreground
                  : scheme === 'dark'
                    ? hex.surfaceElevated
                    : hex.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? hex.foreground : hex.hairline,
              },
            ]}
          >
            <Icon size={13} color={active ? hex.background : c.foreground} strokeWidth={2} />
            <Text
              variant="tab"
              numberOfLines={1}
              style={{
                color: active ? hex.background : hex.mutedForeground,
                fontSize: 11,
                flexShrink: 1,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FeaturedArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          surfaces.roundedCard,
          {
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hex.hairline,
          },
        ]}
      >
        <Thumbnail label={article.thumbnailLabel} tone={article.thumbnailTone} large />
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="eyebrow">{article.source}</Text>
          <Text variant="titleLg" style={{ lineHeight: 26 }}>
            {article.title}
          </Text>
          <View style={[layout.rowBetween, { marginTop: 4 }]}>
            <Text variant="caption" muted>
              {article.publishedAgo} · {article.author}
            </Text>
            <MoreHorizontal size={18} color={c.mutedForeground} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CompactArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          surfaces.roundedCard,
          {
            padding: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hex.hairline,
          },
        ]}
      >
        <Text variant="eyebrow" style={{ marginBottom: 10 }}>
          {article.source}
        </Text>
        <View style={[layout.rowStart, { gap: 12 }]}>
          <View style={[layout.flex1, { minWidth: 0, gap: 8 }]}>
            <Text variant="bodySm" style={{ lineHeight: 22 }}>
              {article.title}
            </Text>
            <View style={[layout.rowBetween, { alignItems: 'center' }]}>
              <View style={[surfaces.pillMuted, { paddingHorizontal: 10, paddingVertical: 4 }]}>
                <Text variant="pill" muted>
                  More coverage
                </Text>
              </View>
              <MoreHorizontal size={18} color={c.mutedForeground} />
            </View>
          </View>
          <Thumbnail label={article.thumbnailLabel} tone={article.thumbnailTone} />
        </View>
        <Text variant="caption" muted style={{ marginTop: 10 }}>
          {article.publishedAgo} · {article.author}
        </Text>
      </View>
    </Pressable>
  );
}

function ArticleDetailModal({
  article,
  onClose,
}: {
  article: NewsArticle | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();

  if (!article) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: hex.background, paddingTop: insets.top }}>
        <View style={[layout.rowBetween, { paddingHorizontal: 8, paddingVertical: 8 }]}>
          <Pressable
            onPress={onClose}
            style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 6 }]}
          >
            <ChevronLeft size={18} color={c.mutedForeground} />
            <Text variant="link" muted>
              News
            </Text>
          </Pressable>
          <MoreHorizontal size={20} color={c.mutedForeground} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          <View style={{ overflow: 'hidden' }}>
            <Thumbnail label={article.thumbnailLabel} tone={article.thumbnailTone} large />
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
            <Text variant="eyebrow">{article.source}</Text>
            <Text variant="hero" style={{ fontSize: 28, lineHeight: 32 }}>
              {article.title}
            </Text>
            <View style={[layout.row, { gap: 8, flexWrap: 'wrap' }]}>
              <Text variant="bodyMuted">{article.publishedAgo}</Text>
              <Text variant="bodyMuted">·</Text>
              <Text variant="bodyMuted">{article.author}</Text>
            </View>
            <View style={[surfaces.hairline, { marginVertical: 4 }]} />
            <Text variant="body" style={{ lineHeight: 24, color: hex.foreground }}>
              {article.body}
            </Text>
            <Text variant="bodyMuted" style={{ lineHeight: 22, marginTop: 8 }}>
              {article.excerpt}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function NewsFeed() {
  const { layout } = useThemeTokens();
  const [category, setCategory] = useState<NewsCategory>('top');
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  const articles = useMemo(
    () => MOCK_ARTICLES.filter((a) => a.categories.includes(category)),
    [category],
  );
  const featured = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.id !== featured?.id);

  const sectionTitle =
    category === 'top'
      ? 'Top stories'
      : category === 'fantasy'
        ? 'Fantasy football'
        : category === 'injuries'
          ? 'Injury reports'
          : 'Roster moves';

  return (
    <View style={layout.section}>
      <CategoryBubbles value={category} onChange={setCategory} />

      <Text variant="sectionTitle" style={{ paddingHorizontal: 4 }}>
        {sectionTitle}
      </Text>

      <View style={layout.stackSm}>
        {featured ? (
          <FeaturedArticleCard article={featured} onPress={() => setSelected(featured)} />
        ) : null}
        {rest.map((article) => (
          <CompactArticleCard key={article.id} article={article} onPress={() => setSelected(article)} />
        ))}
      </View>

      <ArticleDetailModal article={selected} onClose={() => setSelected(null)} />
    </View>
  );
}
