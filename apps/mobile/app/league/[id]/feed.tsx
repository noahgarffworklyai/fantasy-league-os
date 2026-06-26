import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['feed', id],
    queryFn: () => api.get<{ posts: Array<{ id: string; authorName: string; content: string; type: string; reactionCount: number; createdAt: string }> }>(`/leagues/${id}/feed`),
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: () => api.post(`/leagues/${id}/feed`, { content, type: 'post' }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['feed', id] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/feed/${postId}/react`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed', id] }),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.compose}>
        <TextInput
          style={styles.input}
          placeholder="Post to league..."
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
        />
        <Pressable style={styles.postBtn} onPress={() => postMutation.mutate()}>
          <Text style={styles.postBtnText}>Post</Text>
        </Pressable>
      </View>

      <FlatList
        data={data?.posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.author}>{item.authorName}</Text>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.content}>{item.content}</Text>
            <Pressable onPress={() => reactMutation.mutate(item.id)}>
              <Text style={styles.react}>👍 {item.reactionCount}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  compose: { marginBottom: 16, gap: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center' },
  postBtnText: { color: colors.bg, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  author: { color: colors.primary, fontWeight: '700' },
  type: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginTop: 2 },
  content: { color: colors.text, marginTop: 8, lineHeight: 20 },
  react: { color: colors.textMuted, marginTop: 12 },
});
