'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/auth') {
      router.replace('/auth')
    }
  }, [user, loading, pathname])

  // Show loading screen MAX 3 seconds
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0F0B1E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{ fontSize: '64px' }}>🕌</div>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid #C9A84C33',
          borderTop: '3px solid #C9A84C',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}/>
        <p style={{
          color: '#C9A84C',
          fontFamily: 'Georgia, serif',
          fontSize: '16px'
        }}>
          Loading Sanskriti AI...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Not logged in and not on auth page — redirect handled by useEffect
  if (!user && pathname !== '/auth') {
    return null
  }

  return <>{children}</>
}
