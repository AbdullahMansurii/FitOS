import { useState, useEffect } from 'react'
import { Plus, Search, Loader, Trash2, MessageSquare, X, Check, ChevronDown } from 'lucide-react'
import { useFoodStore, useGoalsStore, useSettingsStore } from '@/store/index'
import { createAIProvider } from '@/lib/ai'
import { searchOpenFoodFacts } from '@/lib/foodApi'
import type { ExternalFoodResult } from '@/lib/foodApi'
import { todayISO } from '@/lib/utils'
import type { MealType, FoodLog, ProposedFoodLog, CuratedFood } from '@/types'
import { MacroRing } from '@/components/shared/MacroRing'
import { CURATED_FOODS } from '@/constants/foodDatabase'
import { mapExtractedToProposed, recalculateProposed } from '@/lib/foodMapper'

type LogMode = 'diary' | 'chat' | 'search' | 'manual'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }

export function FoodPage() {
  const { foodLogs, addFoodLog, deleteFoodLog } = useFoodStore()
  const { getActiveGoal } = useGoalsStore()
  const { settings } = useSettingsStore()
  const [date, setDate] = useState(todayISO())
  const [mode, setMode] = useState<LogMode>('diary')
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast')
  const [chatInput, setChatInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExternalFoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsedEntries, setParsedEntries] = useState<ProposedFoodLog[]>([])
  const [confirming, setConfirming] = useState(false)

  // Inline Open Food Facts search state for parsed entries
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [offQuery, setOffQuery] = useState('')
  const [offSearchResults, setOffSearchResults] = useState<ExternalFoodResult[]>([])
  const [offSearching, setOffSearching] = useState(false)

  // Manual entry state
  const [manualName, setManualName] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualQty, setManualQty] = useState('100')

  const activeGoal = getActiveGoal()
  const todayLogs = foodLogs.filter((l) => l.date === date)

  const nutrition = todayLogs.reduce(
    (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein, carbs: acc.carbs + l.carbs, fat: acc.fat + l.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calorieTarget = activeGoal?.calorieTarget || 2000
  const proteinTarget = activeGoal?.proteinTarget || 150

  const logsByMeal = MEAL_TYPES.reduce<Record<MealType, FoodLog[]>>((acc, m) => {
    acc[m] = todayLogs.filter((l) => l.mealType === m)
    return acc
  }, {} as Record<MealType, FoodLog[]>)

  // ─── Search ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.length < 2) { setSearchResults([]); return }
      setSearching(true)
      const results = await searchOpenFoodFacts(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 500)
    return () => clearTimeout(t)
  }, [searchQuery])

  const addFromSearch = (item: ExternalFoodResult, qty = 100) => {
    const ratio = qty / 100
    addFoodLog({
      date,
      mealType: selectedMeal,
      name: item.brand ? `${item.name} (${item.brand})` : item.name,
      quantityG: qty,
      calories: Math.round(item.caloriesPer100g * ratio),
      protein: Math.round(item.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(item.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(item.fatPer100g * ratio * 10) / 10,
    })
    setSearchQuery('')
    setSearchResults([])
    setMode('diary')
  }

  // ─── AI Parse ─────────────────────────────────────────────────────────────

  const handleAIParse = async () => {
    if (!chatInput.trim()) return
    if (!settings.aiApiKey) {
      alert('Add your Groq API key in Settings → AI to use chat logging')
      return
    }
    setParsing(true)
    try {
      const provider = createAIProvider(settings.aiProvider, settings.aiApiKey, settings.aiModel)
      const extracted = await provider.parseFood(chatInput)
      const proposed = extracted.map((item) => mapExtractedToProposed(item))
      setParsedEntries(proposed)
      setConfirming(true)
    } catch (err) {
      console.error(err)
      alert('Failed to parse food. Check your API key.')
    } finally {
      setParsing(false)
    }
  }

  const confirmParsed = () => {
    const hasUnresolved = parsedEntries.some((entry) => entry.resolvedWeightG === null)
    if (hasUnresolved) {
      alert('Please enter a valid weight in grams for all items before saving.')
      return
    }

    const hasNegative = parsedEntries.some((entry) => 
      (entry.resolvedWeightG !== null && entry.resolvedWeightG < 0) ||
      entry.raw.quantity < 0 ||
      entry.calculatedCalories < 0 ||
      entry.calculatedProtein < 0 ||
      entry.calculatedCarbs < 0 ||
      entry.calculatedFat < 0
    )
    if (hasNegative) {
      alert('Please enter non-negative values for all quantities, weights, and macros before saving.')
      return
    }

    parsedEntries.forEach((entry) => {
      addFoodLog({
        date,
        mealType: selectedMeal,
        name: entry.matchedFood ? entry.matchedFood.name : entry.raw.food,
        quantityG: entry.resolvedWeightG || 0,
        calories: entry.calculatedCalories,
        protein: entry.calculatedProtein,
        carbs: entry.calculatedCarbs,
        fat: entry.calculatedFat,
      })
    })
    setChatInput('')
    setParsedEntries([])
    setConfirming(false)
    setMode('diary')
  }

  // ─── Manual Entry ──────────────────────────────────────────────────────────

  const addManual = () => {
    if (!manualName || !manualCalories) return
    addFoodLog({
      date,
      mealType: selectedMeal,
      name: manualName,
      quantityG: Number(manualQty) || 100,
      calories: Number(manualCalories) || 0,
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fat: Number(manualFat) || 0,
    })
    setManualName(''); setManualCalories(''); setManualProtein(''); setManualCarbs(''); setManualFat(''); setManualQty('100')
    setMode('diary')
  }

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Food</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Track your daily nutrition</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
          style={{ width: 160, fontSize: 13 }}
        />
      </div>

      {/* Nutrition summary */}
      <div className="card-elevated" style={{ marginBottom: 20 }}>
        <MacroRing calories={nutrition.calories} calorieTarget={calorieTarget} protein={nutrition.protein} proteinTarget={proteinTarget} carbs={nutrition.carbs} fat={nutrition.fat} />
      </div>

      {/* Log buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode(mode === 'chat' ? 'diary' : 'chat')}
          className={`btn ${mode === 'chat' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <MessageSquare size={14} /> Chat Log
        </button>
        <button
          onClick={() => setMode(mode === 'search' ? 'diary' : 'search')}
          className={`btn ${mode === 'search' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Search size={14} /> Search Food
        </button>
        <button
          onClick={() => setMode(mode === 'manual' ? 'diary' : 'manual')}
          className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Plus size={14} /> Manual Entry
        </button>
        {/* Meal selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {MEAL_TYPES.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMeal(m)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: `1px solid ${selectedMeal === m ? 'var(--accent)' : 'var(--border-default)'}`,
                background: selectedMeal === m ? 'var(--accent-bg)' : 'transparent',
                color: selectedMeal === m ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              {MEAL_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chat logging */}
      {mode === 'chat' && (
        <div className="card-elevated" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--accent)' }}>
            💬 Describe what you ate
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. 6 egg whites, 2 scoops whey, 1 banana..."
              onKeyDown={(e) => e.key === 'Enter' && handleAIParse()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleAIParse} disabled={parsing || !chatInput.trim()}>
              {parsing ? <Loader size={16} className="animate-spin" /> : 'Parse'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            AI will parse your description and show you items to confirm before logging
          </p>

          {/* Confirmation cards */}
          {confirming && parsedEntries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
                Review and confirm ({parsedEntries.length} items):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {parsedEntries.map((e) => (
                  <div key={e.id} style={{ padding: '14px 16px', background: 'var(--bg-base)', borderRadius: 10, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="flex-between">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI parsed: </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>
                            "{e.raw.quantity} {e.raw.unit} of {e.raw.food}"
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: e.confidence === 'high' ? 'rgba(34,197,94,0.1)' : e.confidence === 'medium' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', color: e.confidence === 'high' ? 'rgb(34,197,94)' : e.confidence === 'medium' ? 'rgb(234,179,8)' : 'rgb(239,68,68)' }}>
                            {e.confidence.toUpperCase()} CONFIDENCE
                          </span>
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: e.source === 'curated' ? 'rgba(168,85,247,0.1)' : e.source === 'open_food_facts' ? 'rgba(59,130,246,0.1)' : e.source === 'ai_estimated' ? 'rgba(234,179,8,0.1)' : 'rgba(107,114,128,0.1)', color: e.source === 'curated' ? 'rgb(168,85,247)' : e.source === 'open_food_facts' ? 'rgb(59,130,246)' : e.source === 'ai_estimated' ? 'rgb(234,179,8)' : 'rgb(107,114,128)' }}>
                            {e.source.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setParsedEntries(prev => prev.filter(item => item.id !== e.id))}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {e.source === 'ai_estimated' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.2)',
                        color: 'rgb(234, 179, 8)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        marginTop: 4,
                        marginBottom: 4
                      }}>
                        ⚠️ Estimated values. Review before saving.
                      </div>
                    )}
                    
                    {/* Mapping row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', gap: 8, alignItems: 'center' }}>
                      {/* Food selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Match Food</label>
                        <select
                          value={e.matchedFood?.id || ''}
                          onChange={(evt) => {
                            const foodId = evt.target.value
                            if (foodId === '') {
                              const updated = recalculateProposed(e, {
                                matchedFood: null,
                                selectedServingSize: null,
                                resolvedWeightG: null,
                                confidence: 'low',
                                source: 'custom'
                              })
                              setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                            } else {
                              const newFood = CURATED_FOODS.find(f => f.id === foodId) || null
                              const updated = recalculateProposed(e, {
                                matchedFood: newFood,
                                selectedServingSize: newFood?.servingSizes[0] || null,
                                resolvedWeightG: newFood ? (e.raw.quantity * (newFood.servingSizes[0]?.weightG || 100)) : null,
                                confidence: 'high',
                                source: 'curated'
                              })
                              setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                            }
                          }}
                          className="input"
                          style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                        >
                          <option value="">-- No Match (Custom) --</option>
                          {e.source === 'open_food_facts' && e.matchedFood && (
                            <option value={e.matchedFood.id}>{e.matchedFood.name} (OFF)</option>
                          )}
                          {CURATED_FOODS.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Qty</label>
                        <input
                          type="number"
                          value={e.raw.quantity}
                          onChange={(evt) => {
                            const newQty = Math.max(0, parseFloat(evt.target.value) || 0)
                            const newWeight = e.selectedServingSize 
                              ? newQty * e.selectedServingSize.weightG 
                              : newQty
                            const updated = recalculateProposed(e, {
                              raw: { ...e.raw, quantity: newQty },
                              resolvedWeightG: newWeight
                            })
                            setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                          }}
                          className="input"
                          style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                          min={0}
                          step={0.1}
                        />
                      </div>

                      {/* Unit */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Unit</label>
                        <select
                          value={e.selectedServingSize ? e.selectedServingSize.name : 'grams'}
                          onChange={(evt) => {
                            const sizeName = evt.target.value
                            const matchedSize = e.matchedFood?.servingSizes.find(s => s.name === sizeName) || null
                            const newWeight = matchedSize 
                              ? e.raw.quantity * matchedSize.weightG 
                              : e.raw.quantity // grams
                            const updated = recalculateProposed(e, {
                              selectedServingSize: matchedSize,
                              resolvedWeightG: newWeight,
                              confidence: 'high'
                            })
                            setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                          }}
                          className="input"
                          style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                          disabled={!e.matchedFood}
                        >
                          <option value="grams">grams (g)</option>
                          {e.matchedFood?.servingSizes.map(s => (
                            <option key={s.name} value={s.name}>{s.name} ({s.weightG}g)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Inline Open Food Facts search fallback */}
                    <div style={{ marginTop: 4 }}>
                      {activeSearchId === e.id ? (
                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px dashed var(--accent)', marginTop: 4 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              className="input"
                              value={offQuery}
                              onChange={(evt) => setOffQuery(evt.target.value)}
                              placeholder="Search Open Food Facts..."
                              onKeyDown={async (evt) => {
                                if (evt.key === 'Enter') {
                                  evt.preventDefault()
                                  setOffSearching(true)
                                  const res = await searchOpenFoodFacts(offQuery)
                                  setOffSearchResults(res)
                                  setOffSearching(false)
                                }
                              }}
                              style={{ flex: 1, fontSize: 11, padding: '4px 8px', height: 'auto' }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                setOffSearching(true)
                                const res = await searchOpenFoodFacts(offQuery)
                                setOffSearchResults(res)
                                setOffSearching(false)
                              }}
                              style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                            >
                              Search
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setActiveSearchId(null)
                                setOffSearchResults([])
                                setOffQuery('')
                              }}
                              style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                            >
                              Cancel
                            </button>
                          </div>
                          {offSearching && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                              <Loader size={12} className="animate-spin" /> Searching global products...
                            </div>
                          )}
                          {offSearchResults.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                              {offSearchResults.map((res) => (
                                <div
                                  key={res.id}
                                  style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}
                                  onClick={() => {
                                    const matchedFood: CuratedFood = {
                                      id: 'off-' + res.id,
                                      name: res.brand ? `${res.name} (${res.brand})` : res.name,
                                      aliases: [],
                                      caloriesPer100g: res.caloriesPer100g,
                                      proteinPer100g: res.proteinPer100g,
                                      carbsPer100g: res.carbsPer100g,
                                      fatPer100g: res.fatPer100g,
                                      servingSizes: [
                                        { name: 'grams', weightG: 1 },
                                        { name: 'serving', weightG: 100 }
                                      ]
                                    }
                                    const updated = recalculateProposed(e, {
                                      matchedFood,
                                      selectedServingSize: matchedFood.servingSizes[0],
                                      resolvedWeightG: e.raw.quantity, // map parsed quantity to weight in grams
                                      confidence: 'high',
                                      source: 'open_food_facts'
                                    })
                                    setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                                    setActiveSearchId(null)
                                    setOffSearchResults([])
                                    setOffQuery('')
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{res.name}</div>
                                    {res.brand && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{res.brand}</div>}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--macro-calories)', fontWeight: 600, paddingLeft: 8 }}>
                                    {res.caloriesPer100g} kcal
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {!offSearching && offSearchResults.length === 0 && offQuery && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                              No global products found for "{offQuery}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setActiveSearchId(e.id)
                            setOffQuery(e.raw.food)
                          }}
                          style={{ fontSize: 11, padding: '2px 6px', height: 'auto', color: 'var(--accent)' }}
                        >
                          🔍 Match via Global Search (Open Food Facts)
                        </button>
                      )}
                    </div>

                    {/* Weight overrides and macros display */}
                    <div className="flex-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Weight (g):</span>
                        <input
                          type="number"
                          value={e.resolvedWeightG !== null ? e.resolvedWeightG : ''}
                          onChange={(evt) => {
                            const val = evt.target.value === '' ? null : Math.max(0, parseFloat(evt.target.value))
                            const updated = recalculateProposed(e, {
                              resolvedWeightG: val,
                              confidence: val !== null ? 'high' : 'low'
                            })
                            setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                          }}
                          placeholder="Enter grams"
                          className="input"
                          style={{
                            width: 85, fontSize: 11, padding: '2px 6px', height: 'auto',
                            border: e.resolvedWeightG === null ? '1px solid var(--red)' : '1px solid var(--border-default)'
                          }}
                        />
                        {e.resolvedWeightG === null && (
                          <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 500 }}>
                            Unknown unit "{e.raw.unit}". Please type weight.
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--macro-calories)', fontWeight: 600 }}>{e.calculatedCalories} kcal</span>
                        <span style={{ color: 'var(--macro-protein)' }}>{e.calculatedProtein}g P</span>
                        <span style={{ color: 'var(--macro-carbs)' }}>{e.calculatedCarbs}g C</span>
                        <span style={{ color: 'var(--macro-fat)' }}>{e.calculatedFat}g F</span>
                      </div>
                    </div>

                    {/* Manual Macro Overrides for Unmatched Foods */}
                    {(e.matchedFood === null || e.source === 'ai_estimated') && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', width: '100%', marginBottom: 2 }}>Manual values:</span>
                        {[
                          { label: 'Kcal', key: 'calculatedCalories' },
                          { label: 'Protein (g)', key: 'calculatedProtein' },
                          { label: 'Carbs (g)', key: 'calculatedCarbs' },
                          { label: 'Fat (g)', key: 'calculatedFat' }
                        ].map(m => (
                          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{m.label}:</span>
                            <input
                              type="number"
                              value={e[m.key as 'calculatedCalories' | 'calculatedProtein' | 'calculatedCarbs' | 'calculatedFat'] ?? ''}
                              onChange={(evt) => {
                                const val = Math.max(0, parseFloat(evt.target.value) || 0)
                                const updated = recalculateProposed(e, { [m.key]: val })
                                setParsedEntries(prev => prev.map(item => item.id === e.id ? updated : item))
                              }}
                              className="input"
                              style={{ width: 45, fontSize: 10, padding: '2px 4px', height: 'auto' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setConfirming(false)} style={{ flex: 1 }}>
                  <X size={14} /> Discard
                </button>
                <button className="btn btn-primary" onClick={confirmParsed} style={{ flex: 2 }}>
                  <Check size={14} /> Log {parsedEntries.length} Items
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Food search */}
      {mode === 'search' && (
        <div className="card-elevated" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            🔍 Search Open Food Facts
          </div>
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for any food..."
            autoFocus
          />
          {searching && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader size={16} className="animate-spin" /> Searching...
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {searchResults.map((item) => (
                <FoodSearchResult key={item.id} item={item} onAdd={(qty) => addFromSearch(item, qty)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual entry */}
      {mode === 'manual' && (
        <div className="card-elevated" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>✏️ Manual Entry</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div className="input-group">
                <label className="input-label">Food Name</label>
                <input className="input" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Chicken Breast" />
              </div>
              <div className="input-group">
                <label className="input-label">Quantity (g)</label>
                <input className="input" type="number" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Calories (kcal)', value: manualCalories, set: setManualCalories },
                { label: 'Protein (g)', value: manualProtein, set: setManualProtein },
                { label: 'Carbs (g)', value: manualCarbs, set: setManualCarbs },
                { label: 'Fat (g)', value: manualFat, set: setManualFat },
              ].map(({ label, value, set }) => (
                <div key={label} className="input-group">
                  <label className="input-label">{label}</label>
                  <input className="input" type="number" value={value} onChange={(e) => set(e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setMode('diary')}>Cancel</button>
              <button className="btn btn-primary" onClick={addManual} disabled={!manualName || !manualCalories}>
                <Plus size={14} /> Add to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {MEAL_TYPES.map((meal) => {
          const logs = logsByMeal[meal]
          const mealNutrition = logs.reduce((acc, l) => ({ cal: acc.cal + l.calories, pro: acc.pro + l.protein }), { cal: 0, pro: 0 })
          return (
            <div key={meal} className="card-elevated">
              <div className="flex-between" style={{ marginBottom: logs.length > 0 ? 14 : 0 }}>
                <div className="flex-start" style={{ gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{MEAL_ICONS[meal]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>{meal}</div>
                    {logs.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--macro-calories)' }}>{mealNutrition.cal} kcal</span>
                        {' · '}
                        <span style={{ color: 'var(--macro-protein)' }}>{mealNutrition.pro.toFixed(0)}g protein</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelectedMeal(meal); setMode('search') }}
                  style={{ color: 'var(--accent)' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              {logs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {logs.map((log, i) => (
                    <div key={log.id} className="flex-between" style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{log.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {log.quantityG}g · {log.calories} kcal · {log.protein.toFixed(0)}g P · {log.carbs.toFixed(0)}g C · {log.fat.toFixed(0)}g F
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon-sm" onClick={() => deleteFoodLog(log.id)}>
                        <Trash2 size={14} color="var(--text-muted)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {logs.length === 0 && (
                <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>No items logged</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Food Search Result Card ─────────────────────────────────────────────────

function FoodSearchResult({ item, onAdd }: { item: ExternalFoodResult; onAdd: (qty: number) => void }) {
  const [qty, setQty] = useState(100)
  const [expanded, setExpanded] = useState(false)

  const calories = Math.round(item.caloriesPer100g * qty / 100)
  const protein = (item.proteinPer100g * qty / 100).toFixed(1)

  return (
    <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <div className="flex-between">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
          {item.brand && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.brand}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            <span style={{ color: 'var(--macro-calories)' }}>{item.caloriesPer100g} kcal</span> ·{' '}
            <span style={{ color: 'var(--macro-protein)' }}>{item.proteinPer100g}g P</span> ·{' '}
            <span style={{ color: 'var(--macro-carbs)' }}>{item.carbsPer100g}g C</span> ·{' '}
            <span style={{ color: 'var(--macro-fat)' }}>{item.fatPer100g}g F</span>
            <span style={{ color: 'var(--text-disabled)', marginLeft: 4 }}>per 100g</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : '', transition: '0.2s' }} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onAdd(qty)}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Qty (g):</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="input"
            style={{ width: 80, fontSize: 13 }}
            min={1}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>= {calories} kcal · {protein}g P</span>
        </div>
      )}
    </div>
  )
}
