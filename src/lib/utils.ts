// ─── Utility: cn (class merger) ──────────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Nutrition Math ───────────────────────────────────────────────────────────

export function calcNutrition(caloriesPer100g: number, proteinPer100g: number, carbsPer100g: number, fatPer100g: number, quantityG: number) {
  const ratio = quantityG / 100
  return {
    calories: Math.round(caloriesPer100g * ratio),
    protein: Math.round(proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(carbsPer100g * ratio * 10) / 10,
    fat: Math.round(fatPer100g * ratio * 10) / 10,
  }
}

export function calcEstimated1RM(weight: number, reps: number): number {
  // Epley formula
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(dateStr: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (format === 'short') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (format === 'medium') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDaysBetween(from: string, to: string): number {
  const a = new Date(from)
  const b = new Date(to)
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function getTimeGreeting(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// ─── Number Formatting ─────────────────────────────────────────────────────────

export function formatNumber(n: number, decimals = 1): string {
  if (n === undefined || n === null) return '—'
  return n % 1 === 0 ? n.toString() : n.toFixed(decimals)
}

export function formatWeight(kg: number, unit: 'kg' | 'lbs' = 'kg'): string {
  if (unit === 'lbs') return `${(kg * 2.20462).toFixed(1)} lbs`
  return `${kg} kg`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// ─── Goal Progress ────────────────────────────────────────────────────────────

export function calcGoalProgress(startWeight: number, targetWeight: number, currentWeight: number): number {
  if (startWeight === targetWeight) return 100
  const total = Math.abs(targetWeight - startWeight)
  const done = Math.abs(currentWeight - startWeight)
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
}

// ─── ID Generation ─────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID()
}

// ─── Color Helpers ─────────────────────────────────────────────────────────────

export function getProgressColor(pct: number): string {
  if (pct >= 100) return 'var(--accent)'
  if (pct >= 75) return 'var(--blue)'
  if (pct >= 50) return 'var(--amber)'
  return 'var(--red)'
}

export function getMacroColor(macro: 'calories' | 'protein' | 'carbs' | 'fat'): string {
  const map = {
    calories: 'var(--macro-calories)',
    protein: 'var(--macro-protein)',
    carbs: 'var(--macro-carbs)',
    fat: 'var(--macro-fat)',
  }
  return map[macro]
}
