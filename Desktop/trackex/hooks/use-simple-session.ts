"use client"

import { useState, useEffect } from "react"

interface User {
  id: string
  email: string
  role: string
}

interface Session {
  user: User
  expires: string
}

interface UseSessionResult {
  data: Session | null
  status: "loading" | "authenticated" | "unauthenticated"
}

export function useSimpleSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/simple-session')
        const data = await response.json()

        if (data && data.user) {
          setSession(data)
          setStatus("authenticated")
        } else {
          setSession(null)
          setStatus("unauthenticated")
        }
      } catch (error) {
        console.error('Failed to check session:', error)
        setSession(null)
        setStatus("unauthenticated")
      }
    }

    checkSession()
  }, [])

  return { data: session, status }
}
