import { createContext, useContext, useEffect, useState } from 'react'
import { platform } from '../lib/platformClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    platform.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = platform.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await platform.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await platform.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
