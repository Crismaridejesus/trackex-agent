import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessionCookie = cookies().get('simple-session')
    
    if (sessionCookie) {
      const session = JSON.parse(sessionCookie.value)
      
      // Check if session is expired
      if (new Date(session.expires) > new Date()) {
        return NextResponse.json(session)
      }
    }
    
    return NextResponse.json(null)
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(null)
  }
}
