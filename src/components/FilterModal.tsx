import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Modal } from 'react-native'
import { Text, Button, TextInput, Surface, Chip, SegmentedButtons, useTheme } from 'react-native-paper'
import { TagSelector } from './TagSelector'

interface FilterValues {
  priceMin: string
  priceMax: string
  tagIds: number[]
  sortBy: 'newest' | 'price_asc' | 'price_desc'
  location: string
}

interface FilterModalProps {
  visible: boolean
  onDismiss: () => void
  current: FilterValues
  onApply: (filters: FilterValues) => void
  tags: { id: number; name: string; slug: string }[]
}

export function FilterModal({ visible, onDismiss, current, onApply, tags }: FilterModalProps) {
  const { colors } = useTheme()
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<FilterValues['sortBy']>('newest')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (visible) {
      setPriceMin(current.priceMin)
      setPriceMax(current.priceMax)
      setTagIds(current.tagIds)
      setSortBy(current.sortBy)
      setLocation(current.location)
    }
  }, [visible, current.priceMin, current.priceMax, current.tagIds, current.sortBy, current.location])

  const handleApply = () => {
    onApply({ priceMin, priceMax, tagIds, sortBy, location })
    onDismiss()
  }

  const handleClear = () => {
    setPriceMin('')
    setPriceMax('')
    setTagIds([])
    setSortBy('newest')
    setLocation('')
  }

  return (
    <Modal visible={visible} onDismiss={onDismiss} onRequestClose={onDismiss} animationType="slide" transparent>
        <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
        <Surface style={[styles.modal, { backgroundColor: colors.surface }]} elevation={4}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              Filtros
            </Text>
            <Button onPress={onDismiss}>Cerrar</Button>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text variant="titleSmall" style={styles.sectionTitle}>Ordenar por</Text>
            <SegmentedButtons
              value={sortBy}
              onValueChange={(v) => {
                if (v === 'newest' || v === 'price_asc' || v === 'price_desc') setSortBy(v)
              }}
              buttons={[
                { value: 'newest', label: 'Mas nuevo' },
                { value: 'price_asc', label: 'Precio ↑' },
                { value: 'price_desc', label: 'Precio ↓' },
              ]}
              style={styles.segment}
            />

            <Text variant="titleSmall" style={styles.sectionTitle}>Precio por día</Text>
            <View style={styles.priceRow}>
              <TextInput
                label="Min"
                value={priceMin}
                onChangeText={(v) => setPriceMin(v.replace(/[^0-9]/g, ''))}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.priceInput}
                placeholder="0"
              />
              <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginHorizontal: 8 }}>—</Text>
              <TextInput
                label="Max"
                value={priceMax}
                onChangeText={(v) => setPriceMax(v.replace(/[^0-9]/g, ''))}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.priceInput}
                placeholder="999"
              />
            </View>

            <Text variant="titleSmall" style={styles.sectionTitle}>Ubicación</Text>
            <TextInput
              label="Ciudad o dirección"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              placeholder="Ej: Managua"
            />

            {tags.length > 0 && (
              <>
                <Text variant="titleSmall" style={styles.sectionTitle}>Características</Text>
                <TagSelector tags={tags} selected={tagIds} onChange={setTagIds} />
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.outline }]}>
            <Button mode="text" onPress={handleClear} style={styles.footerBtn}>
              Limpiar filtros
            </Button>
            <Button mode="contained" onPress={handleApply} style={styles.footerBtn}>
              Aplicar
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  body: { paddingHorizontal: 20 },
  sectionTitle: { fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  segment: { marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInput: { flex: 1 },
  input: { marginBottom: 4 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 16,
  },
  footerBtn: { flex: 1, borderRadius: 12 },
})
