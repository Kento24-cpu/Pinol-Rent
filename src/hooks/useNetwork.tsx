import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import NetInfo from '@react-native-community/netinfo'

interface NetworkState {
  isOnline: boolean
}

const NetworkContext = createContext<NetworkState>({ isOnline: true })

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false)
    })
    return () => unsub()
  }, [])

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
