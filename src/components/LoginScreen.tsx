import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import VersionBadge from './VersionBadge'

interface LoginScreenProps {
  onLogin: () => void
}

interface LoginRequest {
  email: string
  password: string
  server_url: string
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Environment-aware server URL - uses localhost in dev, production URL in builds
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const loginRequest: LoginRequest = {
        email,
        password,
        server_url: serverUrl,
      }

      await invoke('login', { request: loginRequest })

      // DO NOT start background services after login
      // Services should only start when user clocks in

      onLogin()
    } catch (error) {
      const errorMessage = error as string
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-container'>
      <VersionBadge position='bottom-right' />
      <div className='login-form'>
        <div className='login-header'>
          <h1>TrackEx Agent</h1>
          <p>Welcome back! Please sign in to continue</p>
        </div>

        {/* Error Display */}
        {error && <div className='error-message'>{error}</div>}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='email'>Email</label>
            <input id='email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='your@email.com' required autoFocus />
          </div>

          <div className='form-group'>
            <label htmlFor='password'>Password</label>
            <input id='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='••••••••' required />
          </div>

          <button type='submit' className='login-button' disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className='login-footer'>
          <p>Secure connection to TrackEx server</p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
