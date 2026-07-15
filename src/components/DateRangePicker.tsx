import { useState, useMemo } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Surface, Icon, useTheme } from 'react-native-paper'

interface DateRangePickerProps {
  pricePerDay: number
  onSelect: (startDate: string, endDate: string, totalDays: number, totalPrice: number) => void
  onCancel: () => void
  disabledDates?: string[]
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function toDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysBetween(a: Date, b: Date): number {
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  return diff < 0 ? 0 : diff + 1
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function DateRangePicker({ pricePerDay, onSelect, onCancel, disabledDates }: DateRangePickerProps) {
  const { colors } = useTheme()
  const today = useMemo(() => new Date(), [])
  const todayStr = formatDate(today)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const days = useMemo(() => {
    const result: { date: string; day: number; month: number; isToday: boolean }[] = []
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, i)
      result.push({
        date: formatDate(d),
        day: d.getDate(),
        month: d.getMonth(),
        isToday: i === 0,
      })
    }
    return result
  }, [today])

  const disabledSet = useMemo(() => new Set(disabledDates ?? []), [disabledDates])

  const handleSelectDate = (date: string) => {
    if (disabledSet.has(date)) return
    if (!startDate || (startDate && endDate)) {
      setStartDate(date)
      setEndDate(null)
    } else {
      if (date < startDate) {
        setStartDate(date)
        setEndDate(null)
      } else {
        setEndDate(date)
      }
    }
  }

  const totalDays = startDate && endDate ? daysBetween(toDate(startDate), toDate(endDate)) : 0
  const totalPrice = totalDays * pricePerDay

  const isDateInRange = (date: string) => {
    if (!startDate) return false
    if (date === startDate) return true
    if (!endDate) return false
    const d = toDate(date)
    const s = toDate(startDate)
    const e = toDate(endDate)
    return d >= s && d <= e
  }

  const monthLabels = useMemo(() => {
    const labels: { key: string; label: string }[] = []
    for (const d of days) {
      if (!labels.some((l) => l.key === `${d.month}`)) {
        labels.push({ key: `${d.month}`, label: MONTH_NAMES[d.month] })
      }
    }
    return labels
  }, [days])

  const renderDay = ({ item }: { item: typeof days[number] }) => {
    const isSelected = item.date === startDate || item.date === endDate
    const inRange = isDateInRange(item.date)
    const isDisabled = disabledSet.has(item.date)
    const isStart = item.date === startDate
    const isEnd = item.date === endDate

    return (
      <View style={styles.dayCell}>
        <Text variant="labelSmall" style={[styles.dayName, { color: colors.onSurfaceVariant }]}>
          {DAY_NAMES[new Date(item.date + 'T00:00:00').getDay()]}
        </Text>
        <Button
          mode={isSelected ? 'contained' : 'text'}
          compact
          disabled={isDisabled}
          onPress={() => handleSelectDate(item.date)}
          style={[
            styles.dayBtn,
            inRange && !isSelected && { backgroundColor: colors.primary + '20', borderRadius: 0 },
            isStart && { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
            isEnd && { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
            isDisabled && { opacity: 0.3 },
          ]}
          contentStyle={styles.dayBtnContent}
          labelStyle={[
            styles.dayLabel,
            isSelected && { color: colors.onPrimary },
            isDisabled && { color: colors.onSurfaceVariant },
          ]}
        >
          {item.day}
        </Button>
      </View>
    )
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.surface }]} elevation={2}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.primary }]}>
        Seleccionar fechas
      </Text>

      {monthLabels.map((m) => (
        <Text key={m.key} variant="labelLarge" style={[styles.monthLabel, { color: colors.onSurface }]}>
          {m.label}
        </Text>
      ))}

      <View style={styles.weekHeader}>
        {DAY_NAMES.map((d) => (
          <Text key={d} variant="labelSmall" style={[styles.weekDay, { color: colors.onSurfaceVariant }]}>
            {d}
          </Text>
        ))}
      </View>

      <FlatList
        data={days}
        renderItem={renderDay}
        keyExtractor={(item) => item.date}
        numColumns={7}
        scrollEnabled={false}
        columnWrapperStyle={styles.weekRow}
      />

      {startDate && (
        <View style={[styles.summary, { borderTopColor: colors.outline }]}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {startDate && !endDate ? 'Selecciona la fecha de fin' : ''}
            {startDate && endDate ? `${totalDays} día${totalDays > 1 ? 's' : ''}` : ''}
          </Text>
          <Text variant="titleMedium" style={[styles.totalPrice, { color: colors.primary }]}>
            {endDate ? `$${totalPrice.toLocaleString('es-NI', { minimumFractionDigits: 0 })}` : ''}
          </Text>
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onCancel} style={styles.actionBtn}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              disabled={!startDate || !endDate}
              onPress={() => onSelect(startDate!, endDate!, totalDays, totalPrice)}
              style={styles.actionBtn}
            >
              Reservar
            </Button>
          </View>
        </View>
      )}
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 20, margin: 16 },
  title: { fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  monthLabel: { fontWeight: '600', marginBottom: 8, marginTop: 4 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: '14.28%', textAlign: 'center', fontWeight: '500', fontSize: 11 },
  weekRow: { marginBottom: 2 },
  dayCell: { width: '14.28%', alignItems: 'center', marginBottom: 2 },
  dayName: { fontSize: 9, marginBottom: 2 },
  dayBtn: { minWidth: 36, height: 36, borderRadius: 18 },
  dayBtnContent: { height: 36, width: 36 },
  dayLabel: { fontSize: 13, margin: 0 },
  summary: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, alignItems: 'center' },
  totalPrice: { fontWeight: 'bold', marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, borderRadius: 12 },
})
