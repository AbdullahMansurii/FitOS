// Open Food Facts API + USDA FoodData Central integration

export interface ExternalFoodResult {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  servingSizeG?: number
  servingName?: string
  source: 'openfoodfacts' | 'usda'
  barcode?: string
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

export async function searchOpenFoodFacts(query: string, limit = 10): Promise<ExternalFoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=product_name,brands,nutriments,serving_size,code`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    
    return (data.products || [])
      .filter((p: Record<string, unknown>) => p.product_name && p.nutriments)
      .map((p: Record<string, unknown>) => {
        const n = p.nutriments as Record<string, number>
        return {
          id: `off_${p.code || Math.random()}`,
          name: String(p.product_name || ''),
          brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
          caloriesPer100g: n['energy-kcal_100g'] || n['energy-kcal'] || 0,
          proteinPer100g: n['proteins_100g'] || 0,
          carbsPer100g: n['carbohydrates_100g'] || 0,
          fatPer100g: n['fat_100g'] || 0,
          fiberPer100g: n['fiber_100g'],
          servingSizeG: p.serving_size ? parseFloat(String(p.serving_size)) : undefined,
          barcode: p.code ? String(p.code) : undefined,
          source: 'openfoodfacts' as const,
        }
      })
      .filter((p: ExternalFoodResult) => p.caloriesPer100g > 0)
      .slice(0, limit)
  } catch {
    return []
  }
}

export async function lookupBarcode(barcode: string): Promise<ExternalFoodResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.product) return null
    const p = data.product
    const n = p.nutriments || {}
    return {
      id: `off_${barcode}`,
      name: p.product_name || 'Unknown',
      brand: p.brands?.split(',')[0]?.trim(),
      caloriesPer100g: n['energy-kcal_100g'] || n['energy-kcal'] || 0,
      proteinPer100g: n['proteins_100g'] || 0,
      carbsPer100g: n['carbohydrates_100g'] || 0,
      fatPer100g: n['fat_100g'] || 0,
      fiberPer100g: n['fiber_100g'],
      barcode,
      source: 'openfoodfacts',
    }
  } catch {
    return null
  }
}
