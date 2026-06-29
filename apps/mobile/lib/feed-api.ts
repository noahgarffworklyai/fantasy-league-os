import type { FeedPost, Poll } from '@flos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type LeagueFeedItem = {
  id: string;
  kind: 'post' | 'announcement' | 'award' | 'recap' | 'poll';
  authorName: string;
  headline: string;
  body?: string;
  createdAt: string;
  reactionCount: number;
  poll?: {
    pollId: string;
    question: string;
    options: Array<{ id: string; text: string; voteCount: number }>;
    userVoteOptionId: string | null;
  };
};

export async function fetchLeagueFeed(leagueId: string) {
  return api.get<{ posts: FeedPost[] }>(`/leagues/${leagueId}/feed`);
}

export async function fetchLeaguePolls(leagueId: string) {
  return api.get<{ polls: Poll[] }>(`/leagues/${leagueId}/polls`);
}

export async function createLeagueFeedPost(
  leagueId: string,
  content: string,
  type: FeedPost['type'] = 'post',
) {
  return api.post<{ post: FeedPost }>(`/leagues/${leagueId}/feed`, { content, type });
}

export async function toggleFeedReaction(postId: string) {
  return api.post<{ reacted: boolean }>(`/feed/${postId}/react`);
}

export async function voteOnPoll(pollId: string, optionId: string) {
  return api.post(`/polls/${pollId}/vote`, { optionId });
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function mergeFeedTimeline(posts: FeedPost[], polls: Poll[]): LeagueFeedItem[] {
  const postItems: LeagueFeedItem[] = posts.map((p) => ({
    id: p.id,
    kind: p.type,
    authorName: p.authorName,
    headline: p.content.split('\n')[0] ?? p.content,
    body: p.content.includes('\n') ? p.content.split('\n').slice(1).join('\n') : undefined,
    createdAt: p.createdAt,
    reactionCount: p.reactionCount,
  }));

  const pollItems: LeagueFeedItem[] = polls.map((poll) => ({
    id: `poll-${poll.id}`,
    kind: 'poll' as const,
    authorName: 'Poll',
    headline: poll.question,
    createdAt: poll.createdAt,
    reactionCount: 0,
    poll: {
      pollId: poll.id,
      question: poll.question,
      options: poll.options,
      userVoteOptionId: poll.userVoteOptionId ?? null,
    },
  }));

  return [...postItems, ...pollItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export { formatRelativeTime };

export function useLeagueFeed(leagueId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['league-feed', leagueId],
    queryFn: async () => {
      const [feed, polls] = await Promise.all([
        fetchLeagueFeed(leagueId!),
        fetchLeaguePolls(leagueId!),
      ]);
      return mergeFeedTimeline(feed.posts, polls.polls);
    },
    enabled: !!leagueId && enabled,
    staleTime: 20_000,
  });

  const postMutation = useMutation({
    mutationFn: (content: string) => createLeagueFeedPost(leagueId!, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league-feed', leagueId] }),
  });

  const reactMutation = useMutation({
    mutationFn: (postId: string) => toggleFeedReaction(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league-feed', leagueId] }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      voteOnPoll(pollId, optionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league-feed', leagueId] }),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    post: postMutation.mutateAsync,
    posting: postMutation.isPending,
    react: reactMutation.mutateAsync,
    vote: voteMutation.mutateAsync,
  };
}
