/**
 * proteinQuality.ts
 * ─────────────────
 * Extensible protein quality scoring system.
 *
 * Currently supports DIAAS (Digestible Indispensable Amino Acid Score).
 * Designed to later support PDCAAS, and a future FitOS Protein Score
 * without requiring schema changes.
 *
 * Architecture:
 * - ProteinQualityMethod: Union type of supported methods
 * - ProteinQualityScore: A method + value pair stored with food entries
 * - Utility functions for interpretation, averaging, and display
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Supported protein quality scoring methods */
export type ProteinQualityMethod = 'diaas' | 'pdcaas' | 'fitos_score' | 'none'

/** A protein quality score with its method */
export interface ProteinQualityScore {
  /** The scoring method used */
  method: ProteinQualityMethod
  /** Normalized score value (0–1+ for DIAAS/PDCAAS, 0–100 for fitos_score) */
  value: number
}

/** Quality tier for display purposes */
export type ProteinQualityTier = 'excellent' | 'good' | 'moderate' | 'low' | 'unknown'

// ─── Constants ──────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<ProteinQualityMethod, string> = {
  diaas: 'DIAAS',
  pdcaas: 'PDCAAS',
  fitos_score: 'FitOS Score',
  none: 'Unknown',
}

// DIAAS thresholds (normalized 0–1+ scale)
const DIAAS_THRESHOLDS = {
  excellent: 1.0,   // ≥ 100% (score ≥ 1.0)
  good: 0.75,       // 75-99%
  moderate: 0.50,   // 50-74%
  // below 50% = low
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Create a protein quality score from raw DIAAS chart value.
 * Chart values are percentage-based (e.g., 110 = 110% = 1.10 normalized).
 */
export function fromDiaasRaw(rawValue: number | null): ProteinQualityScore | null {
  if (rawValue === null || rawValue === undefined) return null
  return {
    method: 'diaas',
    value: rawValue / 100,
  }
}

/**
 * Create a protein quality score from a normalized value.
 */
export function createScore(method: ProteinQualityMethod, value: number): ProteinQualityScore {
  return { method, value }
}

/**
 * Get the quality tier for display/color coding.
 */
export function getQualityTier(score: ProteinQualityScore | null): ProteinQualityTier {
  if (!score || score.method === 'none') return 'unknown'

  const val = score.value

  if (score.method === 'diaas' || score.method === 'pdcaas') {
    if (val >= DIAAS_THRESHOLDS.excellent) return 'excellent'
    if (val >= DIAAS_THRESHOLDS.good) return 'good'
    if (val >= DIAAS_THRESHOLDS.moderate) return 'moderate'
    return 'low'
  }

  // Future: FitOS Score (0-100 scale)
  if (score.method === 'fitos_score') {
    if (val >= 80) return 'excellent'
    if (val >= 60) return 'good'
    if (val >= 40) return 'moderate'
    return 'low'
  }

  return 'unknown'
}

/**
 * Get a human-readable label for the scoring method.
 */
export function getMethodLabel(method: ProteinQualityMethod): string {
  return METHOD_LABELS[method] || 'Unknown'
}

/**
 * Format the score for display (e.g., "DIAAS: 1.10" or "108%").
 */
export function formatScore(score: ProteinQualityScore | null): string {
  if (!score || score.method === 'none') return '—'

  if (score.method === 'diaas' || score.method === 'pdcaas') {
    return `${Math.round(score.value * 100)}`
  }

  if (score.method === 'fitos_score') {
    return `${Math.round(score.value)}/100`
  }

  return `${score.value}`
}

/**
 * Get the CSS color variable for a quality tier.
 */
export function getTierColor(tier: ProteinQualityTier): string {
  switch (tier) {
    case 'excellent': return 'var(--accent)'
    case 'good': return 'var(--emerald)'
    case 'moderate': return 'var(--amber)'
    case 'low': return 'var(--red)'
    case 'unknown': return 'var(--text-muted)'
  }
}

/**
 * Get a display emoji for the quality tier.
 */
export function getTierEmoji(tier: ProteinQualityTier): string {
  switch (tier) {
    case 'excellent': return '🥇'
    case 'good': return '🥈'
    case 'moderate': return '🥉'
    case 'low': return '⚠️'
    case 'unknown': return ''
  }
}

// ─── Aggregation Functions ──────────────────────────────────────────────────

/**
 * Calculate the weighted average protein quality score for a set of food logs.
 * Weights by protein grams — foods contributing more protein influence the score more.
 */
export function weightedAverageScore(
  items: Array<{ proteinG: number; score: ProteinQualityScore | null }>
): ProteinQualityScore | null {
  let totalWeight = 0
  let weightedSum = 0
  let method: ProteinQualityMethod = 'none'

  for (const item of items) {
    if (!item.score || item.score.method === 'none') continue
    if (method === 'none') method = item.score.method
    // Only average scores of the same method
    if (item.score.method !== method) continue

    totalWeight += item.proteinG
    weightedSum += item.score.value * item.proteinG
  }

  if (totalWeight === 0 || method === 'none') return null

  return {
    method,
    value: Math.round((weightedSum / totalWeight) * 100) / 100,
  }
}

/**
 * Calculate the percentage of protein from high-quality sources.
 * High quality = DIAAS ≥ 0.75 (75%).
 */
export function highQualityProteinPct(
  items: Array<{ proteinG: number; score: ProteinQualityScore | null }>
): number {
  let totalProtein = 0
  let highQualityProtein = 0

  for (const item of items) {
    totalProtein += item.proteinG
    if (item.score && item.score.method !== 'none' && item.score.value >= 0.75) {
      highQualityProtein += item.proteinG
    }
  }

  if (totalProtein === 0) return 0
  return Math.round((highQualityProtein / totalProtein) * 100)
}

/**
 * Serialize a ProteinQualityScore for database storage.
 * Returns { score: number | null, method: string } matching DB column names.
 */
export function serializeForDb(score: ProteinQualityScore | null): {
  protein_quality_score: number | null
  protein_quality_method: string
} {
  if (!score || score.method === 'none') {
    return { protein_quality_score: null, protein_quality_method: 'none' }
  }
  return {
    protein_quality_score: score.value,
    protein_quality_method: score.method,
  }
}

/**
 * Deserialize a ProteinQualityScore from database rows.
 */
export function deserializeFromDb(
  score: number | null | undefined,
  method: string | null | undefined
): ProteinQualityScore | null {
  if (score === null || score === undefined || !method || method === 'none') {
    return null
  }
  return {
    method: method as ProteinQualityMethod,
    value: score,
  }
}
