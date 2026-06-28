/**
 * personalNutritionChart.ts
 * ─────────────────────────
 * Abdullah's personal nutrition reference chart from Dt. Het Patel.
 * This is the HIGHEST PRIORITY nutrition source in FitOS.
 *
 * Each entry stores macros per its reference serving size.
 * The nutritionResolver normalizes everything to per-100g for
 * consistent calculations across all food sources.
 *
 * DIAAS scores are stored as raw values from the chart (e.g., 110 = 1.10).
 * The protein quality system normalizes these to 0–1+ scale.
 */

import type { CuratedFood, ServingSize } from '@/types'

// ─── Raw chart data ────────────────────────────────────────────────────────

export interface PersonalNutritionEntry {
  /** Unique stable ID with `pnc-` prefix to avoid collisions */
  id: string
  /** Display name */
  name: string
  /** Alternative names for fuzzy matching */
  aliases: string[]
  /** Reference serving quantity and unit from the chart */
  referenceServing: { quantity: number; unit: string }
  /** Macros per reference serving */
  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number
  /** DIAAS score from chart (raw scale, e.g., 110 = 110%) */
  diaasRaw: number | null
  /** Pre-calculated per-100g values (for entries measured in grams) */
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  /** Additional serving sizes for portion resolution */
  servingSizes: ServingSize[]
}

function entry(
  id: string,
  name: string,
  aliases: string[],
  refQty: number,
  refUnit: string,
  cal: number,
  protein: number,
  carbs: number,
  fat: number,
  diaas: number | null,
  servingSizes: ServingSize[] = []
): PersonalNutritionEntry {
  // Convert to per-100g if unit is grams/ml
  const isGramBased = refUnit === 'gm' || refUnit === 'ml' || refUnit === 'g'
  const factor = isGramBased ? 100 / refQty : 1

  return {
    id: `pnc-${id}`,
    name,
    aliases,
    referenceServing: { quantity: refQty, unit: refUnit },
    caloriesPerServing: cal,
    proteinPerServing: protein,
    carbsPerServing: carbs,
    fatPerServing: fat,
    diaasRaw: diaas,
    caloriesPer100g: isGramBased ? Math.round(cal * factor * 10) / 10 : cal,
    proteinPer100g: isGramBased ? Math.round(protein * factor * 10) / 10 : protein,
    carbsPer100g: isGramBased ? Math.round(carbs * factor * 10) / 10 : carbs,
    fatPer100g: isGramBased ? Math.round(fat * factor * 10) / 10 : fat,
    servingSizes: [
      { name: `${refQty}${refUnit}`, weightG: isGramBased ? refQty : 0 },
      ...servingSizes,
    ],
  }
}

export const PERSONAL_NUTRITION_CHART: PersonalNutritionEntry[] = [
  // ── Dairy ──────────────────────────────────────────────────────────────────
  entry('curd', 'Curd', ['dahi', 'yogurt (indian)', 'plain curd'], 100, 'gm',
    70, 5, 3, 4, 110,
    [{ name: 'bowl', weightG: 150 }, { name: 'cup', weightG: 200 }]),

  entry('yogurt', 'Yogurt', ['greek yogurt', 'flavored yogurt', 'yoghurt'], 100, 'gm',
    71, 5, 6, 3, 100,
    [{ name: 'cup', weightG: 200 }, { name: 'bowl', weightG: 150 }]),

  entry('paneer', 'Paneer', ['cottage cheese', 'indian cheese', 'paneer cubes'], 100, 'gm',
    299, 18, 3, 24, 118,
    [{ name: 'slice', weightG: 40 }, { name: 'cube', weightG: 25 }, { name: 'block', weightG: 200 }]),

  entry('milk', 'Milk', ['dudh', 'whole milk', 'full cream milk', 'toned milk'], 250, 'ml',
    125, 8, 12, 8, 118,
    [{ name: 'glass', weightG: 250 }, { name: 'cup', weightG: 200 }]),

  // ── Plant Protein ─────────────────────────────────────────────────────────
  entry('tofu', 'Tofu', ['soy paneer', 'bean curd'], 100, 'gm',
    125, 14, 6, 5, 78,
    [{ name: 'slice', weightG: 50 }, { name: 'block', weightG: 200 }]),

  entry('tempeh', 'Tempeh', ['fermented soybean'], 100, 'gm',
    193, 18.5, 9, 10, 85,
    [{ name: 'slice', weightG: 50 }, { name: 'block', weightG: 200 }]),

  entry('soyachunk', 'Soyachunk', ['soya chunks', 'soy chunks', 'meal maker', 'nutrela', 'soya nuggets', 'soya badi'], 100, 'gm',
    349, 52, 33, 1, 91,
    [{ name: 'cup (dry)', weightG: 50 }, { name: 'handful', weightG: 30 }]),

  entry('soyabean', 'Soyabean', ['soybean', 'soya bean', 'soybeans'], 30, 'gm',
    120, 10.8, 6, 6, 85,
    [{ name: 'tablespoon', weightG: 15 }]),

  entry('peanut', 'Peanut', ['peanuts', 'groundnut', 'moongfali', 'mungfali'], 30, 'gm',
    184, 6.3, 7.5, 14, 43,
    [{ name: 'handful', weightG: 30 }, { name: 'tablespoon', weightG: 15 }]),

  entry('sattu', 'Sattu', ['sattu powder', 'roasted gram flour'], 30, 'gm',
    114.6, 6.3, 18.3, 1.8, 58,
    [{ name: 'tablespoon', weightG: 15 }, { name: 'glass (drink)', weightG: 30 }]),

  entry('chana', 'Chana', ['chickpeas', 'chole', 'garbanzo', 'kabuli chana', 'chana dal'], 30, 'gm',
    130, 7, 10, 2, 58,
    [{ name: 'cup (cooked)', weightG: 150 }, { name: 'handful', weightG: 30 }]),

  entry('besan', 'Besan', ['gram flour', 'chickpea flour', 'besan flour'], 100, 'gm',
    384, 20, 61, 7, 58,
    [{ name: 'cup', weightG: 100 }, { name: 'tablespoon', weightG: 15 }]),

  entry('seeds-nut', 'Seeds & Nuts', ['mixed seeds', 'nut mix', 'trail mix', 'seeds mix', 'dry fruits'], 30, 'gm',
    168, 5.4, 8.4, 13, 40,
    [{ name: 'handful', weightG: 30 }, { name: 'tablespoon', weightG: 15 }]),

  entry('seitan', 'Seitan', ['wheat gluten', 'vital wheat gluten', 'mock meat'], 30, 'gm',
    114, 22, 4, 1, 40,
    [{ name: 'slice', weightG: 30 }, { name: 'serving', weightG: 100 }]),

  entry('pulses', 'Pulses', ['dal', 'lentils', 'toor dal', 'moong dal', 'masoor dal', 'urad dal', 'rajma'], 30, 'gm',
    100, 7, 17, 0, 63,
    [{ name: 'cup (cooked)', weightG: 150 }, { name: 'bowl', weightG: 200 }]),

  entry('pea', 'Pea (Dry)', ['dry peas', 'yellow peas', 'green peas dry', 'matar', 'dried peas'], 30, 'gm',
    102, 7.2, 18, 0.6, 64,
    [{ name: 'cup', weightG: 150 }, { name: 'handful', weightG: 30 }]),

  // ── Supplements ───────────────────────────────────────────────────────────
  entry('whey-protein', 'Whey Protein', ['protein powder', 'whey', 'protein shake', 'whey isolate', 'protein scoop'], 30, 'gm',
    120, 22, 7, 2, 117,
    [{ name: 'scoop', weightG: 30 }, { name: 'double scoop', weightG: 60 }]),

  // ── Eggs ───────────────────────────────────────────────────────────────────
  entry('egg', 'Egg', ['whole egg', 'anda', 'boiled egg', 'egg (whole)', 'eggs'], 50, 'gm',
    73, 6, 0, 6, 113,
    [{ name: 'egg', weightG: 50 }, { name: 'large egg', weightG: 60 }]),

  entry('egg-white', 'Egg White', ['egg whites', 'anda safed'], 33, 'gm',
    16.2, 4, 0, 0.2, 125,
    [{ name: 'egg white', weightG: 33 }, { name: 'large egg white', weightG: 40 }]),

  // ── Meat ───────────────────────────────────────────────────────────────────
  entry('chicken-breast', 'Chicken Breast', ['chicken', 'grilled chicken', 'chicken breast cooked', 'murgh breast'], 100, 'gm',
    140, 26, 0, 4, 108,
    [{ name: 'piece', weightG: 150 }, { name: 'half breast', weightG: 85 }]),

  entry('mutton', 'Mutton', ['goat meat', 'lamb', 'red meat', 'bakra', 'gosht'], 100, 'gm',
    294, 25, 0, 24, 111,
    [{ name: 'piece', weightG: 60 }, { name: 'serving', weightG: 100 }]),

  // ── Grains ────────────────────────────────────────────────────────────────
  entry('cereal', 'Cereal', ['breakfast cereal', 'cornflakes', 'oat cereal'], 20, 'gm',
    70, 2, 15, 0, 47,
    [{ name: 'serving', weightG: 30 }, { name: 'bowl', weightG: 40 }]),
]

/**
 * Convert a PersonalNutritionEntry to the standard CuratedFood format
 * used throughout FitOS for consistent handling.
 */
export function toCuratedFood(entry: PersonalNutritionEntry): CuratedFood {
  return {
    id: entry.id,
    name: entry.name,
    aliases: entry.aliases,
    caloriesPer100g: entry.caloriesPer100g,
    proteinPer100g: entry.proteinPer100g,
    carbsPer100g: entry.carbsPer100g,
    fatPer100g: entry.fatPer100g,
    servingSizes: entry.servingSizes,
  }
}

/**
 * Get the DIAAS score normalized to 0–1+ scale (chart uses percentage scale).
 * Returns null if no DIAAS data available.
 */
export function getDiaasScore(entry: PersonalNutritionEntry): number | null {
  if (entry.diaasRaw === null) return null
  return entry.diaasRaw / 100
}

/**
 * Quick lookup map by ID for O(1) access.
 */
export const PERSONAL_CHART_MAP = new Map(
  PERSONAL_NUTRITION_CHART.map((e) => [e.id, e])
)
