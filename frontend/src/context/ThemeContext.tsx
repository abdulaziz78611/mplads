import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ThemeColorSet {
  name: string
  key: string
  primary: string
  secondary: string
  highlight: string
  sub: string
  palette: string[]
}

export const THEME_SETS: Record<string, ThemeColorSet> = {
  forest: {
    name: 'Light Mint & Pine',
    key: 'forest',
    primary: '#1b6a55',
    secondary: '#2d8870',
    highlight: '#0d5241',
    sub: '#e8f2ed',
    palette: ['#1b6a55', '#2d8870', '#41a98e', '#0d5241', '#5bc4a9', '#78d4bd', '#163832', '#082a20']
  },
  ocean: {
    name: 'Light Sky Azure',
    key: 'ocean',
    primary: '#0284c7',
    secondary: '#0ea5e9',
    highlight: '#0369a1',
    sub: '#e4effa',
    palette: ['#0284c7', '#0ea5e9', '#38bdf8', '#0369a1', '#7dd3fc', '#02527d', '#1e40af', '#075985']
  },
  amethyst: {
    name: 'Light Lavender Mist',
    key: 'amethyst',
    primary: '#7c3aed',
    secondary: '#9333ea',
    highlight: '#6d28d9',
    sub: '#eee6fa',
    palette: ['#7c3aed', '#9333ea', '#a855f7', '#6d28d9', '#c084fc', '#581c87', '#7e22ce', '#3b0764']
  },
  sunset: {
    name: 'Light Rose Blossom',
    key: 'sunset',
    primary: '#e11d48',
    secondary: '#f43f5e',
    highlight: '#be123c',
    sub: '#fce3e7',
    palette: ['#e11d48', '#f43f5e', '#fb7185', '#be123c', '#fda4af', '#9f1239', '#e11d48', '#881337']
  },
  matrix: {
    name: 'Light Spring Meadow',
    key: 'matrix',
    primary: '#059669',
    secondary: '#10b981',
    highlight: '#047857',
    sub: '#e5f5eb',
    palette: ['#059669', '#10b981', '#34d399', '#047857', '#6ee7b7', '#065f46', '#059669', '#022c22']
  },
  amber: {
    name: 'Light Golden Honey',
    key: 'amber',
    primary: '#d97706',
    secondary: '#f59e0b',
    highlight: '#b45309',
    sub: '#faeed7',
    palette: ['#d97706', '#f59e0b', '#fbbf24', '#b45309', '#fcd34d', '#92400e', '#d97706', '#78350f']
  }
}

export const THEME_KEYS = ['forest', 'ocean', 'amethyst', 'sunset', 'matrix', 'amber']

interface ThemeContextType {
  activeTheme: ThemeColorSet
  themeKey: string
}

const ThemeContext = createContext<ThemeContextType>({
  activeTheme: THEME_SETS.forest,
  themeKey: 'forest'
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(0)

  useEffect(() => {
    // Automatically cycle to next light theme every 7 seconds
    const interval = setInterval(() => {
      setThemeIndex(prev => (prev + 1) % THEME_KEYS.length)
    }, 7000)

    return () => clearInterval(interval)
  }, [])

  const currentKey = THEME_KEYS[themeIndex]
  const currentTheme = THEME_SETS[currentKey] || THEME_SETS.forest

  useEffect(() => {
    // Synchronize HTML element data-theme attribute for instant CSS variable transitions
    document.documentElement.setAttribute('data-theme', currentKey)
  }, [currentKey])

  return (
    <ThemeContext.Provider value={{ activeTheme: currentTheme, themeKey: currentKey }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useActiveTheme() {
  return useContext(ThemeContext)
}
