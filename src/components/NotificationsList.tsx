import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Text, Surface, Icon, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../stores/authStore'
import { useNotifications, type NotificationItem } from '../hooks/useNotifications'
import { useCallback } from 'react'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-NI', { day: 'numeric', month: 'short' })
}

function notificationData(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>
  return {}
}

function notificationIcon(data: unknown): string {
  const d = notificationData(data)
  const type = d.type as string | undefined
  if (type === 'booking') return 'calendar-check'
  if (type === 'chat') return 'forum'
  if (type === 'admin_review') return 'shield-check'
  return 'bell'
}

export function NotificationsList() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const role = useAuthStore((s) => s.role)
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

  const handlePress = useCallback(async (item: NotificationItem) => {
    if (!item.read) await markAsRead(item.id)
    const d = notificationData(item.data)
    const type = d.type as string | undefined
    const bookingId = d.booking_id as number | undefined
    if (!role) return
    const group = role === 'owner' ? '/(owner)' : role === 'admin' ? '/(admin)' : '/(renter)'
    if (type === 'booking' && bookingId) {
      router.navigate(`${group}/bookings/${bookingId}`)
    } else if (type === 'admin_review' && bookingId) {
      router.navigate(`/(admin)/payments/${bookingId}`)
    }
  }, [markAsRead, role])

  const renderItem = useCallback(({ item }: { item: NotificationItem }) => {
    const isUnread = !item.read
    return (
      <Surface
        style={[
          styles.item,
          {
            backgroundColor: isUnread ? colors.primaryContainer : colors.surface,
          },
        ]}
        elevation={isUnread ? 1 : 0}
        onTouchEnd={() => handlePress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: isUnread ? colors.primary + '20' : 'transparent' }]}>
          <Icon source={notificationIcon(item.data) as any} size={22} color={isUnread ? colors.primary : colors.onSurfaceVariant} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              variant="bodyMedium"
              style={[styles.title, { color: colors.onSurface, fontWeight: isUnread ? 'bold' : '400' }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {timeAgo(item.created_at)}
            </Text>
          </View>
          {item.body && (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={2}>
              {item.body}
            </Text>
          )}
        </View>
        {isUnread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
      </Surface>
    )
  }, [colors, handlePress])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <Surface style={[styles.headerBar, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {unreadCount} no leída{unreadCount !== 1 ? 's' : ''}
          </Text>
          <IconButton icon="check-all" size={20} onPress={markAllAsRead} />
        </Surface>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} />}
        ItemSeparatorComponent={() => <Divider style={{ marginLeft: 72 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="bell-off" size={48} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
              No hay notificaciones
            </Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, marginLeft: 12 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { flex: 1, marginRight: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContainer: { flex: 1 },
})
