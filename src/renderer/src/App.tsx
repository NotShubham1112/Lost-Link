import { useState, useEffect } from 'react'
import LoadingScreen from './components/LoadingScreen'
import HomePage from './components/HomePage'
import ChatInterface from './components/ChatInterface'

type AppState = 'loading' | 'home' | 'chat'

function App(): React.JSX.Element {
  const [currentState, setCurrentState] = useState<AppState>('loading')
  const [localIP, setLocalIP] = useState('0.0.0.0')
  const [deviceID] = useState(() => Math.random().toString(36).substring(2, 15))

  // @ts-ignore
  const { api } = window

  useEffect(() => {
    api.getLocalIP().then(setLocalIP)
    // Simulate initialization time
    if (currentState === 'loading') {
      const timer = setTimeout(() => {
        setCurrentState('home')
      }, 2500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [currentState])

  const renderScreen = () => {
    switch (currentState) {
      case 'loading':
        return <LoadingScreen />
      case 'home':
        return <HomePage deviceID={deviceID} onOpenChat={() => setCurrentState('chat')} />
      case 'chat':
        return <ChatInterface deviceID={deviceID} deviceIP={localIP} onBack={() => setCurrentState('home')} />
      default:
        return <HomePage deviceID={deviceID} onOpenChat={() => setCurrentState('chat')} />
    }
  }

  return (
    <>
      {renderScreen()}
    </>
  )
}

export default App
