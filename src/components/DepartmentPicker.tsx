import { useState } from 'react'
import { View, ScrollView, StyleSheet, Modal, Platform } from 'react-native'
import { Text, Button, Searchbar, useTheme, Icon } from 'react-native-paper'

interface Department {
  id: number
  name: string
}

interface DepartmentPickerProps {
  departments: Department[]
  value: number | null
  onChange: (id: number, name: string) => void
}

export function DepartmentPicker({ departments, value, onChange }: DepartmentPickerProps) {
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const { colors } = useTheme()

  const selected = departments.find((d) => d.id === value)
  const filtered = query
    ? departments.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
    : departments

  return (
    <>
      <Button
        mode="outlined"
        onPress={() => setVisible(true)}
        icon="map-marker"
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {selected ? selected.name : 'Seleccionar departamento'}
      </Button>

      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        animationType="slide"
        transparent
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                Departamento
              </Text>
              <Button onPress={() => setVisible(false)}>Cerrar</Button>
            </View>

            <Searchbar
              placeholder="Buscar departamento..."
              value={query}
              onChangeText={setQuery}
              style={styles.search}
            />

            <ScrollView style={styles.list}>
              {filtered.map((dept) => (
                <Button
                  key={dept.id}
                  mode="text"
                  contentStyle={styles.itemContent}
                  style={styles.item}
                  onPress={() => {
                    onChange(dept.id, dept.name)
                    setVisible(false)
                    setQuery('')
                  }}
                  icon={value === dept.id ? 'check-circle' : 'circle-outline'}
                  textColor={value === dept.id ? colors.primary : colors.onSurface}
                >
                  {dept.name}
                </Button>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: { borderRadius: 12 },
  buttonContent: { flexDirection: 'row-reverse' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  search: { marginHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 8 },
  item: { borderRadius: 12, marginBottom: 2 },
  itemContent: { justifyContent: 'flex-start', paddingVertical: 8 },
})
