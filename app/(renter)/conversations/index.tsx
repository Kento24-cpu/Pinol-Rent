import { useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { Text, Card, Searchbar, useTheme, Icon, Avatar, Badge, Button } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../../src/stores/authStore'
import { useConversations } from '../../../src/hooks/useConversations'
import { ScreenContainer } from '../../../src/components/ScreenContainer'

export default function RenterConversationsScreen() {
  const { colors } = useTheme()
  const session = useAuthStore((s) => s.session)
  const { conversations, loading, refetch } = useConversations()
  const [search, setSearch] = useState('')

  useFocusEffect(useCallback(() => { refetch() }, [refetch]))

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon source="forum-lock" size={48} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={{ marginTop: 16, color: colors.onSurface }}>
          Inicia sesión para ver tus mensajes
        </Text>
        <Button mode="contained" onPress={() => router.push('/(public)/login')} style={{ marginTop: 20 }}>
          Iniciar sesión
        </Button>
      </View>
    )
  }

  const filtered = search.trim()
    ? conversations.filter((c) =>
        `${c.car?.brand ?? ''} ${c.car?.model ?? ''} ${c.owner?.full_name ?? ''}`
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
      <ScreenContainer style={{ flex: 1 }}>
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
                Explora autos y contacta a los dueños
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const latest = Array.isArray(item.latest_message) ? item.latest_message[0] : item.latest_message
            return (
            <TouchableOpacity onPress={() => router.push(`/(renter)/conversations/${item.id}`)}>
              <Card style={styles.card} mode="elevated" elevation={1}>
                <View style={styles.row}>
                  <View>
                    {item.owner?.avatar_url ? (
                      <Avatar.Image size={48} source={{ uri: item.owner.avatar_url }} />
                    ) : (
                      <Avatar.Text size={48} label={(item.owner?.full_name?.[0] ?? '?').toUpperCase()} />
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
                        {item.owner?.full_name ?? 'Dueño'}
                      </Text>
                      {latest && (
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                          {latest.created_at ? new Date(latest.created_at).toLocaleDateString() : ''}
                        </Text>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                      {item.car ? `${item.car.brand} ${item.car.model}` : 'Auto'}
                    </Text>
                    {latest && (
                      <Text variant="bodyMedium" numberOfLines={1} style={{ marginTop: 2 }}>
                        {latest.content}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
            )
          }}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          style={{ flex: 1 }}
        />
      </ScreenContainer>
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
