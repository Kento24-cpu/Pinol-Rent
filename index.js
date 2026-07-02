import { StyleSheet } from 'react-native'

if (typeof StyleSheet.setFlag === 'function') {
  StyleSheet.setFlag('darkMode', 'class')
}

import 'expo-router/entry'
