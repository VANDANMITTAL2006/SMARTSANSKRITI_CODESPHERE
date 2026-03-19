'use client'
import { useEffect } from 'react'
export function BackendPrewarmer() {
  useEffect(() => {
    fetch('https://heritageai-backend.onrender.com/')
      .catch(() => {})
  }, [])
  return null
}
