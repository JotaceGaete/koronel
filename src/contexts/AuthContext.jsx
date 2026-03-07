import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const profileOperations = {
    async load(userId) {
      if (!userId) return
      setProfileLoading(true)
      try {
        const { data, error } = await supabase?.from('user_profiles')?.select('*')?.eq('id', userId)?.single()
        if (!error) setUserProfile(data)
      } catch (error) {
        console.error('Profile load error:', error)
      } finally {
        setProfileLoading(false)
      }
    },
    clear() {
      setUserProfile(null)
      setProfileLoading(false)
    }
  }

  const authStateHandlers = {
    onChange: (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        profileOperations?.load(session?.user?.id)
      } else {
        profileOperations?.clear()
      }
    }
  }

  useEffect(() => {
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      authStateHandlers?.onChange(null, session)
    })
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange(
      authStateHandlers?.onChange
    )
    return () => subscription?.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({ email, password })
      return { data, error }
    } catch (error) {
      return { error: { message: 'Error de red. Por favor intenta de nuevo.' } }
    }
  }

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase?.auth?.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || '' }
        }
      })
      return { data, error }
    } catch (error) {
      return { error: { message: 'Error de red. Por favor intenta de nuevo.' } }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : ''
      const { data, error } = await supabase?.auth?.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) return { error }
      if (data?.url) window.location.href = data.url
      return { data, error }
    } catch (error) {
      return { error: { message: 'Error de red. Por favor intenta de nuevo.' } }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase?.auth?.signOut()
      if (!error) {
        setUser(null)
        profileOperations?.clear()
      }
      return { error }
    } catch (error) {
      return { error: { message: 'Error de red. Por favor intenta de nuevo.' } }
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'No hay usuario autenticado' } }
    try {
      const { data, error } = await supabase?.from('user_profiles')?.update(updates)?.eq('id', user?.id)?.select()?.single()
      if (!error) setUserProfile(data)
      return { data, error }
    } catch (error) {
      return { error: { message: 'Error de red. Por favor intenta de nuevo.' } }
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
