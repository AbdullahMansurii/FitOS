import { useState, useMemo } from 'react'
import { 
  UtensilsCrossed, Plus, Trash2, Copy, Edit3, X, 
  Calendar, Play, Search, Folder, Star, Zap 
} from 'lucide-react'
import { useFoodStore, useUIStore } from '@/store/index'
import { todayISO, generateId } from '@/lib/utils'
import { getAllFoods, resolveFoodById } from '@/lib/nutritionResolver'
import { weightedAverageScore } from '@/lib/proteinQuality'
import type { SavedMeal, MealType, CuratedFood } from '@/types'
import { Modal } from '@/components/shared/Modal'


const CATEGORIES = [
  { val: 'all', label: 'All Meals' },
  { val: 'breakfast', label: 'Breakfast 🌅' },
  { val: 'lunch', label: 'Lunch ☀️' },
  { val: 'dinner', label: 'Dinner 🌙' },
  { val: 'snack', label: 'Snack 🍎' },
  { val: 'pre_workout', label: 'Pre-Workout ⚡' },
  { val: 'post_workout', label: 'Post-Workout 🔋' },
  { val: 'custom', label: 'Custom 🍽️' }
]

interface DenormalizedMealItem {
  id: string
  foodItemId: string
  name: string
  quantityG: number
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  diaas: number | null
  source: string
}

export function SavedMealsPage() {
  const { 
    savedMeals, addSavedMeal, updateSavedMeal, deleteSavedMeal, 
    duplicateSavedMeal, incrementSavedMealUsage, addFoodLog, togglePinSavedMeal
  } = useFoodStore()
  const { activeDate } = useUIStore()

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null)
  const [sortBy, setSortBy] = useState<'pinned' | 'recent' | 'frequent' | 'name'>('pinned')
  
  // Quick Log Modal State
  const [quickLogMeal, setQuickLogMeal] = useState<SavedMeal | null>(null)
  const [logDate, setLogDate] = useState(activeDate || todayISO())
  const [logMealType, setLogMealType] = useState<MealType>('breakfast')

  // Modal Form State
  const [mealName, setMealName] = useState('')
  const [mealCategory, setMealCategory] = useState('custom')
  const [mealItems, setMealItems] = useState<DenormalizedMealItem[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Filtered Saved Meals
  const filteredMeals = savedMeals.filter(m => {
    const matchesCat = activeCategory === 'all' || m.category === activeCategory
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Sorted Saved Meals based on user choice + pinned status
  const sortedMeals = useMemo(() => {
    const meals = [...filteredMeals]
    meals.sort((a, b) => {
      if (sortBy === 'pinned') {
        const aPinned = a.isPinned ? 1 : 0
        const bPinned = b.isPinned ? 1 : 0
        if (aPinned !== bPinned) return bPinned - aPinned
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'recent') {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
        return bTime - aTime
      }
      if (sortBy === 'frequent') {
        const aCount = a.usageCount || 0
        const bCount = b.usageCount || 0
        return bCount - aCount
      }
      return a.name.localeCompare(b.name)
    })
    return meals
  }, [filteredMeals, sortBy])

  // One-tap Quick Log
  const handleOneTapQuickLog = (meal: SavedMeal) => {
    const today = activeDate || todayISO()
    
    let mealType: MealType = 'breakfast'
    if (meal.category === 'breakfast' || meal.category === 'lunch' || meal.category === 'dinner' || meal.category === 'snack') {
      mealType = meal.category as MealType
    } else {
      const hour = new Date().getHours()
      if (hour >= 5 && hour < 11) mealType = 'breakfast'
      else if (hour >= 11 && hour < 16) mealType = 'lunch'
      else if (hour >= 16 && hour < 22) mealType = 'dinner'
      else mealType = 'snack'
    }

    const items = meal.items as unknown as DenormalizedMealItem[] || []
    items.forEach(item => {
      const ratio = item.quantityG / 100
      addFoodLog({
        date: today,
        mealType: mealType,
        name: item.name,
        foodItemId: item.foodItemId,
        savedMealId: meal.id,
        quantityG: item.quantityG,
        calories: Math.round(item.caloriesPer100g * ratio),
        protein: Math.round(item.proteinPer100g * ratio * 10) / 10,
        carbs: Math.round(item.carbsPer100g * ratio * 10) / 10,
        fat: Math.round(item.fatPer100g * ratio * 10) / 10,
        proteinQualityScore: item.diaas,
        proteinQualityMethod: item.diaas ? 'diaas' : 'none',
        nutritionSource: item.source || 'manual',
        savedMealVersion: meal.version || 1
      })
    })

    incrementSavedMealUsage(meal.id)
    alert(`⚡ Logged "${meal.name}" instantly to today's ${mealType}!`)
  }

  // Open creation modal
  const handleOpenCreate = () => {
    setEditingMeal(null)
    setMealName('')
    setMealCategory('custom')
    setMealItems([])
    setFoodSearch('')
    setIsModalOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = (meal: SavedMeal) => {
    setEditingMeal(meal)
    setMealName(meal.name)
    setMealCategory(meal.category || 'custom')
    setMealItems((meal.items as unknown as DenormalizedMealItem[]) || [])
    setFoodSearch('')
    setIsModalOpen(true)
  }

  // Add item to draft meal
  const handleAddFoodItem = (food: CuratedFood, source: string, diaas: number | null) => {
    const newItem: DenormalizedMealItem = {
      id: generateId(),
      foodItemId: food.id,
      name: food.name,
      quantityG: 100, // Default 100g
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      diaas,
      source
    }
    setMealItems([...mealItems, newItem])
    setFoodSearch('')
    setShowDropdown(false)
  }


  // Calculate live preview metrics
  const totals = mealItems.reduce((acc, item) => {
    const ratio = item.quantityG / 100
    return {
      calories: acc.calories + Math.round(item.caloriesPer100g * ratio),
      protein: acc.protein + Math.round(item.proteinPer100g * ratio * 10) / 10,
      carbs: acc.carbs + Math.round(item.carbsPer100g * ratio * 10) / 10,
      fat: acc.fat + Math.round(item.fatPer100g * ratio * 10) / 10,
    }
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  // Calculate average DIAAS
  const diaasAvg = weightedAverageScore(
    mealItems.map(item => ({
      proteinG: (item.proteinPer100g * item.quantityG) / 100,
      score: item.diaas ? { method: 'diaas', value: item.diaas } : null
    }))
  )

  // Save/Update Draft Meal
  const handleSaveMeal = () => {
    if (!mealName.trim()) {
      alert('Please enter a name for the saved meal.')
      return
    }
    if (mealItems.length === 0) {
      alert('Please add at least one food item to the saved meal.')
      return
    }

    const mealData = {
      name: mealName,
      category: mealCategory,
      items: mealItems as unknown as import('@/types').SavedMealItem[],
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      // Extensible metrics
      proteinQualityScore: diaasAvg ? diaasAvg.value : null,
      proteinQualityMethod: diaasAvg ? 'diaas' : 'none',
      updatedAt: new Date().toISOString()
    }

    if (editingMeal) {
      updateSavedMeal(editingMeal.id, mealData)
    } else {
      addSavedMeal(mealData)
    }
    setIsModalOpen(false)
  }

  // Trigger quick logging
  const handleQuickLog = () => {
    if (!quickLogMeal) return
    
    // Log each item in the saved meal as a food log
    const items = quickLogMeal.items as unknown as DenormalizedMealItem[] || []
    
    items.forEach(item => {
      const ratio = item.quantityG / 100
      addFoodLog({
        date: logDate,
        mealType: logMealType,
        name: item.name,
        foodItemId: item.foodItemId,
        savedMealId: quickLogMeal.id,
        quantityG: item.quantityG,
        calories: Math.round(item.caloriesPer100g * ratio),
        protein: Math.round(item.proteinPer100g * ratio * 10) / 10,
        carbs: Math.round(item.carbsPer100g * ratio * 10) / 10,
        fat: Math.round(item.fatPer100g * ratio * 10) / 10,
        proteinQualityScore: item.diaas,
        proteinQualityMethod: item.diaas ? 'diaas' : 'none',
        nutritionSource: item.source || 'manual',
        savedMealVersion: quickLogMeal.version || 1
      })
    })

    incrementSavedMealUsage(quickLogMeal.id)
    setQuickLogMeal(null)
    alert(`Successfully logged "${quickLogMeal.name}" to ${logMealType} on ${logDate}!`)
  }

  // Filter foods for search list
  const filteredDatabaseFoods = foodSearch.trim().length >= 2 
    ? getAllFoods().filter(rf => rf.food.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
        rf.food.aliases.some(a => a.toLowerCase().includes(foodSearch.toLowerCase())))
    : []

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Saved Meals
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Create and quick-log meal templates
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> New Meal
        </button>
      </div>

      {/* Search and Category Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved meals..."
              style={{ paddingLeft: 40, height: 42, fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input"
              style={{ height: 42, fontSize: 13, padding: '0 12px', width: 140, cursor: 'pointer' }}
            >
              <option value="pinned">⭐ Pinned First</option>
              <option value="recent">🕒 Recently Used</option>
              <option value="frequent">🔥 Most Frequent</option>
              <option value="name">🔤 Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Categories Tab Scroll */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.val}
              onClick={() => setActiveCategory(cat.val)}
              style={{
                whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: activeCategory === cat.val ? 'var(--accent)' : 'var(--bg-elevated)',
                color: activeCategory === cat.val ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Meals Grid */}
      {sortedMeals.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {sortedMeals.map(meal => {
            const items = meal.items as unknown as DenormalizedMealItem[] || []
            const avgDiaas = meal.proteinQualityScore
            
            return (
              <div 
                key={meal.id} 
                className="card-elevated hover-glow" 
                style={{ 
                  display: 'flex', flexDirection: 'column', height: '100%', padding: 20,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default',
                  borderTop: meal.isPinned ? '3px solid var(--accent)' : 'none'
                }}
              >
                {/* Card Title & Category */}
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {meal.name}
                      {meal.isPinned && <Star size={12} fill="var(--accent)" color="var(--accent)" />}
                    </h3>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'inline-block', marginTop: 4 }}>
                      {meal.category?.replace('_', ' ') || 'custom'}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      className="btn btn-ghost btn-icon-sm" 
                      onClick={() => togglePinSavedMeal(meal.id)}
                      title={meal.isPinned ? "Unpin meal" : "Pin meal"}
                      style={{ color: meal.isPinned ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      <Star size={13} fill={meal.isPinned ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon-sm" 
                      onClick={() => handleOpenEdit(meal)}
                      title="Edit template"
                    >
                      <Edit3 size={13} color="var(--text-secondary)" />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon-sm" 
                      onClick={() => duplicateSavedMeal(meal.id)}
                      title="Duplicate meal"
                    >
                      <Copy size={13} color="var(--text-secondary)" />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon-sm" 
                      onClick={() => { if(confirm('Delete this meal?')) deleteSavedMeal(meal.id) }}
                      title="Delete meal"
                    >
                      <Trash2 size={13} color="var(--red)" />
                    </button>
                  </div>
                </div>

                {/* Items List snippet */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                  {items.slice(0, 4).map((item, idx) => (
                    <div key={item.id || idx} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                        • {item.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.quantityG}g</span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 8 }}>
                      + {items.length - 4} more items
                    </div>
                  )}
                </div>

                {/* Macro Summary Area */}
                <div style={{ background: 'var(--bg-base)', padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 8, color: 'var(--macro-calories)', fontWeight: 600 }}>KCAL</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-calories)' }}>{meal.totalCalories}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: 'var(--macro-protein)', fontWeight: 600 }}>PRO</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-protein)' }}>{meal.totalProtein}g</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: 'var(--macro-carbs)', fontWeight: 600 }}>CARB</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-carbs)' }}>{meal.totalCarbs}g</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: 'var(--macro-fat)', fontWeight: 600 }}>FAT</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-fat)' }}>{meal.totalFat}g</div>
                    </div>
                  </div>
                </div>

                {/* Footer metrics / Quick log */}
                <div className="flex-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {avgDiaas && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        🥇 Avg DIAAS: {Math.round(avgDiaas * 100)}%
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      Used: {meal.usageCount || 0} times
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOneTapQuickLog(meal)}
                      title="1-Tap Instant Log to Today"
                      style={{ padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234,179,8,0.1)', color: 'rgb(202,138,4)', border: '1px solid rgba(234,179,8,0.2)' }}
                    >
                      <Zap size={10} fill="currentColor" /> Instant
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setQuickLogMeal(meal)
                        setLogMealType(meal.category && ['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.category) ? meal.category as MealType : 'breakfast')
                      }}
                      style={{ padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Play size={10} fill="currentColor" /> Log...
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-glass" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Folder size={32} style={{ marginBottom: 12, opacity: 0.5, margin: '0 auto 12px auto', display: 'block' }} />
          <h3>No Saved Meals Found</h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {searchQuery ? 'Try adjusting your search query' : 'Create your first meal template to log items in one click'}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        closeOnOverlayClick={false}
        maxWidth={500}
        title={
          <div className="flex-start" style={{ gap: 8 }}>
            <UtensilsCrossed size={18} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
              {editingMeal ? `Edit "${editingMeal.name}"` : 'Create Saved Meal'}
            </span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Meal Template Name</label>
              <input
                className="input"
                placeholder="e.g. Morning Protein Shake"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                style={{ fontSize: 13, height: 38 }}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                value={mealCategory}
                onChange={(e) => setMealCategory(e.target.value)}
                className="input"
                style={{ fontSize: 13, height: 38 }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.val} value={c.val}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Food Item Search */}
          <div style={{ position: 'relative' }} className="input-group">
            <label className="input-label">Add Food Item</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                value={foodSearch}
                onChange={(e) => {
                  setFoodSearch(e.target.value)
                  setShowDropdown(true)
                }}
                placeholder="Type to search foods (min. 2 chars)..."
                style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
              />
            </div>

            {/* Dropdown database results */}
            {showDropdown && foodSearch.trim().length >= 2 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 8, maxHeight: 180, overflowY: 'auto', marginTop: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {filteredDatabaseFoods.length > 0 ? (
                  filteredDatabaseFoods.map(rf => (
                    <div
                      key={rf.food.id}
                      onClick={() => handleAddFoodItem(rf.food, rf.source, rf.diaas)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      className="hover-bg"
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{rf.food.name}</span>
                        {rf.source === 'personal_chart' && (
                          <span style={{ fontSize: 9, padding: '1px 4px', background: 'rgba(34,197,94,0.1)', color: 'rgb(34,197,94)', borderRadius: 4, marginLeft: 6 }}>
                            CHART
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {rf.food.caloriesPer100g} kcal/100g
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '10px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No matching foods found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Added items list */}
          <div className="input-group">
            <label className="input-label">Foods in Template ({mealItems.length})</label>
            {mealItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {mealItems.map((item, idx) => {
                  const resolved = resolveFoodById(item.foodItemId)
                  if (!resolved) return null
                  const foodName = resolved.food.name
                  return (
                    <div key={idx} className="flex-between" style={{ background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {foodName}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {Math.round(resolved.food.caloriesPer100g * (item.quantityG / 100))} kcal | {Math.round(resolved.food.proteinPer100g * (item.quantityG / 100))}g P
                        </div>
                      </div>

                      {/* Weight Selector */}
                      <div className="flex-start" style={{ gap: 6, flexShrink: 0 }}>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 64, height: 28, padding: '2px 6px', fontSize: 11, textAlign: 'center' }}
                          value={item.quantityG}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setMealItems(prev => prev.map((it, i) => i === idx ? { ...it, quantityG: val } : it))
                          }}
                        />

                        {/* Serving sizes helper dropdown */}
                        <select
                          className="input"
                          style={{ height: 28, fontSize: 10, padding: '2px 4px' }}
                          onChange={(e) => {
                            const sizeWeight = parseFloat(e.target.value)
                            if (sizeWeight > 0) {
                                setMealItems(prev => prev.map((it, i) => i === idx ? { ...it, quantityG: sizeWeight } : it))
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">(g)</option>
                          {resolved.food.servingSizes.map(s => (
                              <option key={s.name} value={s.weightG}>{s.name} ({s.weightG}g)</option>
                          ))}
                        </select>

                        <button
                          onClick={() => setMealItems(mealItems.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border-default)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No food items added. Search above to add foods.
              </div>
            )}
          </div>

          {/* Template Live Preview */}
          {mealItems.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 12, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                TEMPLATE TOTALS PREVIEW
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--macro-calories)', fontWeight: 600 }}>CALORIES</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-calories)' }}>{totals.calories} kcal</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--macro-protein)', fontWeight: 600 }}>PROTEIN</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-protein)' }}>{totals.protein}g</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--macro-carbs)', fontWeight: 600 }}>CARBS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-carbs)' }}>{totals.carbs}g</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--macro-fat)', fontWeight: 600 }}>FAT</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--macro-fat)' }}>{totals.fat}g</div>
                </div>
              </div>
              
              {diaasAvg && (
                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                  🥇 Weighted Average DIAAS Score: {Math.round(diaasAvg.value * 100)}%
                </div>
              )}
            </div>
          )}

          {/* Save actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveMeal} style={{ flex: 2 }} disabled={!mealName.trim() || mealItems.length === 0}>
              {editingMeal ? 'Save Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!quickLogMeal}
        onClose={() => setQuickLogMeal(null)}
        maxWidth={360}
        title={
          <div className="flex-start" style={{ gap: 8 }}>
            <Calendar size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Log "{quickLogMeal?.name}"</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Date to Log</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="input"
              style={{ height: 38, fontSize: 13 }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Meal Type</label>
            <select
              value={logMealType}
              onChange={(e) => setLogMealType(e.target.value as MealType)}
              className="input"
              style={{ height: 38, fontSize: 13 }}
            >
              <option value="breakfast">Breakfast 🌅</option>
              <option value="lunch">Lunch ☀️</option>
              <option value="dinner">Dinner 🌙</option>
              <option value="snack">Snack 🍎</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setQuickLogMeal(null)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleQuickLog} style={{ flex: 2 }}>
              Log Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
