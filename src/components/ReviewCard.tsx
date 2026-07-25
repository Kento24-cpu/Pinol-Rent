import { View, Image, StyleSheet } from 'react-native'
import { Text, Icon, useTheme } from 'react-native-paper'
import { RATING_COLOR } from '../lib/theme'

interface ReviewCardProps {
  rating: number
  comment: string | null
  createdAt: string | null
  renterName: string
  renterAvatar: string | null
}

export function ReviewCard({ rating, comment, createdAt, renterName, renterAvatar }: ReviewCardProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        {renterAvatar ? (
          <Image source={{ uri: renterAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
              {renterName[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{renterName}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Icon
                key={s}
                source={s <= rating ? 'star' : 'star-outline'}
                size={14}
                color={s <= rating ? RATING_COLOR : colors.onSurfaceVariant}
              />
            ))}
          </View>
        </View>
        {createdAt && (
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            {new Date(createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      {comment && (
        <Text variant="bodyMedium" style={[styles.comment, { color: colors.onSurface }]}>
          {comment}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: 'bold' },
  headerInfo: { marginLeft: 12, flex: 1 },
  stars: { flexDirection: 'row', gap: 1, marginTop: 2 },
  comment: { marginTop: 8, lineHeight: 20 },
})
