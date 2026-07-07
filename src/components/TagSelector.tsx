import { View, StyleSheet } from 'react-native'
import { Chip, useTheme } from 'react-native-paper'

interface Tag {
  id: number
  name: string
  slug: string
}

interface TagSelectorProps {
  tags: Tag[]
  selected: number[]
  onChange: (ids: number[]) => void
}

export function TagSelector({ tags, selected, onChange }: TagSelectorProps) {
  const { colors } = useTheme()

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <View style={styles.container}>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id)
        return (
          <Chip
            key={tag.id}
            selected={isSelected}
            onPress={() => toggle(tag.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
              },
            ]}
            textStyle={{
              color: isSelected ? colors.onPrimary : colors.onSurfaceVariant,
            }}
            showSelectedCheck
            selectedColor={colors.primary}
          >
            {tag.name}
          </Chip>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 4 },
})
