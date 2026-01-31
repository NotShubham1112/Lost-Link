import { useState, useEffect } from 'react'
import LoadingScreen from './components/LoadingScreen'
import HomePage from './components/HomePage'
import ChatInterface from './components/ChatInterface'
import Onboarding from './components/Onboarding'
import HostLobby from './components/HostLobby'
import JoinLobby from './components/JoinLobby'

type AppState = 'loading' | 'onboarding' | 'home' | 'chat' | 'host-lobby' | 'join-lobby'

function App(): React.JSX.Element {
  const [currentState, setCurrentState] = useState<AppState>('loading')
  const [localIP, setLocalIP] = useState('0.0.0.0')
  const [username, setUsername] = useState('')
  const [deviceID] = useState(() => Math.random().toString(36).substring(2, 10).toUpperCase())

  // @ts-ignore
  const { api } = window

  useEffect(() => {
    api.getLocalIP().then(setLocalIP)

    // Always transition to onboarding (Transient Identity)
    // We delay slightly to show the loading animation for a premium feel
    const timer = setTimeout(() => setCurrentState('onboarding'), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleOnboardingComplete = async (name: string) => {
    // No localStorage logic here - purely session based
    setUsername(name)
    await api.setDisplayName(name)
    setCurrentState('home')
  }

  const handleLogout = async () => {
    try {
      await api.resetSession()
      setUsername('')
      setCurrentState('onboarding')
    } catch (error) {
      console.error("Logout failed", error)
      setCurrentState('onboarding') // Fallback
    }
  }

  const renderScreen = () => {
    switch (currentState) {
      case 'loading':
        return <LoadingScreen />
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />
      case 'home':
        return (
          <HomePage
            deviceID={deviceID}
            username={username}
            onOpenChat={() => setCurrentState('chat')}
            onOpenHost={() => setCurrentState('host-lobby')}
            onOpenJoin={() => setCurrentState('join-lobby')}
            onLogout={handleLogout}
          />
        )
      case 'chat':
        return (
          <ChatInterface
            deviceID={deviceID}
            deviceIP={localIP}
            username={username}
            onBack={() => setCurrentState('home')}
            onLogout={handleLogout}
          />
        )
      case 'host-lobby':
        return (
          <HostLobby
            username={username}
            onBack={() => setCurrentState('home')}
          />
        )
      case 'join-lobby':
        return (
          <JoinLobby
            username={username}
            onBack={() => setCurrentState('home')}
          />
        )
      default:
        return <HomePage deviceID={deviceID} username={username} onOpenChat={() => setCurrentState('chat')} onLogout={handleLogout} />
    }
  }

  return (
    <>
      {renderScreen()}
    </>
  )
}

export default App
