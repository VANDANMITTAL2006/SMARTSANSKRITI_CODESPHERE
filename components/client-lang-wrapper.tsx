'use client'
import { useEffect } from 'react'
import { useLang } from '@/lib/languageContext'

export function ClientLangWrapper() {
  const { lang } = useLang()
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.setAttribute('data-lang', lang)
  }, [lang])
  return null
}
