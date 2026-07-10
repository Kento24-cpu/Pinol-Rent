import { useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { Text, Card, Searchbar, useTheme, Icon, Avatar, Badge } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useConversations } from '../../../src/hooks/useConversations'

export default function OwnerConversationsScreen() {
  const { colors } = useTheme()
  const { conversations, loading, refetch } = useConversations()
  const [search, setSearch] = useState('')

  useFocusEffect(useCallback(() => { refetch() }, [refetch]))

  const filtered = search.trim()
    ? conversations.filter((c) =>
        `${c.car?.brand ?? ''} ${c.car?.model ?? ''} ${c.renter?.full_name ?? ''}`
          .toLowerCase().includes(search.toLowerCase()))
    : conversations

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Searchbar
        placeholder="Buscar conversaciones..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="forum-outline" size={48} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
              No tienes conversaciones
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Los arrendatarios te contactarán desde los autos
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(owner)/conversations/${item.id}`)}>
            <Card style={styles.card} mode="elevated" elevation={1}>
              <View style={styles.row}>
                <View>
                  {item.renter?.avatar_url ? (
                    <Avatar.Image size={48} source={{ uri: item.renter.avatar_url }} />
                  ) : (
                    <Avatar.Text size={48} label={(item.renter?.full_name?.[0] ?? '?').toUpperCase()} />
                  )}
                  {!!item.unread_count && (
                    <Badge size={18} style={styles.badge}>
                      {item.unread_count}
                    </Badge>
                  )}
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold', flex: 1 }} numberOfLines={1}>
                      {item.renter?.full_name ?? 'Arrendatario'}
                    </Text>
                    {item.latest_message && (
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        {new Date(item.latest_message.created_at ?? '').toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                    {item.car ? `${item.car.brand} ${item.car.model}` : 'Auto'}
                  </Text>
                  {item.latest_message && (
                    <Text variant="bodyMedium" numberOfLines={1} style={{ marginTop: 2 }}>
                      {item.latest_message.content}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchbar: { margin: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: { marginVertical: 4, borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, marginLeft: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContainer: { flex: 1 },
  badge: { position: 'absolute', top: -4, right: -4 },
})
