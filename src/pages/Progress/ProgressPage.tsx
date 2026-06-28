import { useState, useMemo, useCallback } from 'react'
import { Scale, TrendingDown, TrendingUp, Plus, Trash2, BarChart2, Ruler, Calendar, Award, Heart, Moon, Footprints, Activity, Camera } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useGoalsStore, useWeightStore, useWorkoutStore, useProfileStore, useFoodStore, useRecoveryStore, usePhotosStore } from '@/store/index'
import { todayISO, formatDate, daysAgo, calcGoalProgress } from '@/lib/utils'
import { WeightLogModal } from '@/components/shared/WeightLogModal'
import { GoalSetupModal } from '@/components/shared/GoalSetupModal'
import { getRecompositionReport } from '@/lib/recompositionIntelligence'
import { getNutritionAnalytics, getNutritionRecommendation } from '@/lib/nutritionIntelligence'
import { Modal } from '@/components/shared/Modal'

type Range = '7d' | '30d' | '90d'

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  unitLabel?: string
}

const CustomTooltip = ({ active, payload, label, unitLabel = 'kg' }: CustomTooltipProps) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</p>
        <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{payload[0].value} {unitLabel}</p>
      </div>
    )
  }
  return null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  successful_recomp: { label: 'Recomping Successfully', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  lean_bulk: { label: 'Lean Bulk On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  gaining_muscle: { label: 'Lean Bulk On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  losing_fat: { label: 'Fat Loss On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  cutting: { label: 'Cutting On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  stalled: { label: 'Weight Stable', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  aggressive_bulk: { label: 'Bulk Too Aggressive', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  aggressive_cut: { label: 'Cut Too Aggressive', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  insufficient_data: { label: 'Insufficient Data', color: 'var(--text-muted)', bg: 'var(--bg-muted)', icon: '⚪' }
}

const NUTRITION_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  increase_calories: { label: 'Increase Calories', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  decrease_calories: { label: 'Decrease Calories', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  maintain_calories: { label: 'Calories On Target', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  increase_protein: { label: 'Increase Protein', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  reduce_rate_of_gain: { label: 'Reduce Rate Of Gain', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟠' },
  increase_rate_of_gain: { label: 'Increase Rate Of Gain', color: 'var(--blue)', bg: 'rgba(59,130,246,0.1)', icon: '🔵' },
  reduce_rate_of_loss: { label: 'Aggressive Cut Detected', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  increase_rate_of_loss: { label: 'Reduce Rate Of Loss', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟠' }
}

export function ProgressPage() {
  const profile = useProfileStore((s) => s.profile)
  const getActiveGoal = useGoalsStore((s) => s.getActiveGoal)
  const foodLogs = useFoodStore((s) => s.foodLogs)
  const logs = useWeightStore((s) => s.logs)
  const deleteLog = useWeightStore((s) => s.deleteLog)
  const getRange = useWeightStore((s) => s.getRange)
  const measurements = useWeightStore((s) => s.measurements)
  const sessions = useWorkoutStore((s) => s.sessions)
  const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs)
  const deleteRecoveryLog = useRecoveryStore((s) => s.deleteRecoveryLog)
  
  const [activeTab, setActiveTab] = useState<'weight' | 'physique' | 'photos' | 'nutrition' | 'recovery'>('weight')
  const [range, setRange] = useState<Range>('30d')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)

  // Photos state and selectors
  const { photos, addPhoto, deletePhoto } = usePhotosStore()
  const [photoDate, setPhotoDate] = useState(todayISO())
  const [photoType, setPhotoType] = useState<'front' | 'left' | 'right' | 'back'>('front')
  const [photoNotes, setPhotoNotes] = useState('')
  const [selectedExpandPhoto, setSelectedExpandPhoto] = useState<string | null>(null)

  const today = todayISO()
  const activeGoal = getActiveGoal()
  const isImperial = profile?.weightUnit === 'lbs'
  
  const weightLabel = isImperial ? 'lbs' : 'kg'
  const lengthLabel = isImperial ? 'in' : 'cm'

  const displayWeight = useCallback((kg: number) => isImperial ? Math.round(kg * 2.20462 * 10) / 10 : kg, [isImperial])
  const displayLength = useCallback((cm: number) => isImperial ? Math.round(cm / 2.54 * 10) / 10 : cm, [isImperial])

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Record<string, typeof photos[0]>> = {}
    photos.forEach((p) => {
      if (!groups[p.date]) {
        groups[p.date] = {}
      }
      groups[p.date][p.photoType] = p
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [photos])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        addPhoto({
          date: photoDate,
          photoType,
          photoData: reader.result,
          notes: photoNotes.trim() || undefined,
        })
        setPhotoNotes('')
      }
    }
    reader.readAsDataURL(file)
  }

  // Nutrition Intelligence Data
  const nutritionAnalytics = useMemo(() => {
    const calTarget = activeGoal?.calorieTarget || 2000
    const protTarget = activeGoal?.proteinTarget || 150
    return getNutritionAnalytics(foodLogs, calTarget, protTarget)
  }, [foodLogs, activeGoal])

  const nutritionRecommendation = useMemo(() => {
    return getNutritionRecommendation(logs, measurements, foodLogs, sessions, activeGoal, profile)
  }, [logs, measurements, foodLogs, sessions, activeGoal, profile])

  // Recovery Trends derived data
  const recoveryAnalytics = useMemo(() => {
    // Sort recovery logs ascending by date
    const sorted = [...recoveryLogs].sort((a, b) => a.date.localeCompare(b.date))
    
    // Last 7 logs for averages
    const last7 = sorted.slice(-7)
    
    const sleepSum = last7.reduce((sum, r) => sum + (r.sleepHours || 0), 0)
    const sleepCount = last7.filter(r => r.sleepHours !== null).length
    const avgSleep = sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : '—'
    
    const stepsSum = last7.reduce((sum, r) => sum + (r.dailySteps || 0), 0)
    const stepsCount = last7.filter(r => r.dailySteps !== null).length
    const avgSteps = stepsCount > 0 ? Math.round(stepsSum / stepsCount) : '—'
    
    const moodSum = last7.reduce((sum, r) => sum + (r.mood || 0), 0)
    const moodCount = last7.filter(r => r.mood !== null).length
    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '—'
    
    const energySum = last7.reduce((sum, r) => sum + (r.energy || 0), 0)
    const energyCount = last7.filter(r => r.energy !== null).length
    const avgEnergy = energyCount > 0 ? (energySum / energyCount).toFixed(1) : '—'

    // Map data for charts over selected range
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90 }[range]
    const filteredRange = sorted.filter(r => r.date >= daysAgo(rangeDays))
    
    const chartData = filteredRange.map((r) => ({
      date: formatDate(r.date, 'short'),
      sleep: r.sleepHours || 0,
      steps: r.dailySteps || 0,
      mood: r.mood || 0,
      energy: r.energy || 0,
      soreness: r.muscleSoreness || 0,
      fullDate: r.date
    }))

    return {
      avgSleep,
      avgSteps,
      avgMood,
      avgEnergy,
      chartData,
      history: [...sorted].reverse()
    }
  }, [recoveryLogs, range])

  // 1. Weight Trends Data
  const latestWeight = logs.length > 0 ? [...logs].sort((a, b) => b.date.localeCompare(a.date))[0] : null
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90 }[range]
  const rawRangeData = getRange(daysAgo(rangeDays), today).sort((a, b) => a.date.localeCompare(b.date))
  
  const rangeData = rawRangeData.map((l) => ({
    date: formatDate(l.date, 'short'),
    weight: displayWeight(l.weightKg),
    id: l.id,
    fullDate: l.date
  }))

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  const trend = rawRangeData.length >= 2
    ? rawRangeData[rawRangeData.length - 1].weightKg - rawRangeData[0].weightKg
    : null

  const goalProgress = activeGoal && latestWeight
    ? calcGoalProgress(activeGoal.startWeight, activeGoal.targetWeight || activeGoal.startWeight, latestWeight.weightKg)
    : 0

  // 2. Recomposition Report
  const recompReport = useMemo(() => {
    return getRecompositionReport(measurements, logs, sessions)
  }, [measurements, logs, sessions])

  // 3. Physique Analytics Derived Data
  const weightMap = useMemo(() => {
    const map = new Map<string, number>()
    logs.forEach(l => map.set(l.date, l.weightKg))
    measurements.forEach(m => {
      if (m.weightKg !== undefined && m.weightKg > 0) {
        map.set(m.date, m.weightKg)
      }
    })
    return Array.from(map.entries())
      .map(([date, weightKg]) => ({ date, value: weightKg }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [logs, measurements])

  const waistHistory = useMemo(() => {
    return measurements
      .filter(m => m.waistCm !== undefined && m.waistCm > 0)
      .map(m => ({ date: m.date, value: m.waistCm! }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [measurements])

  // Charts data for Physique Analytics (mapped to user display units)
  const physiqueWeightChartData = useMemo(() => {
    return weightMap.map(w => ({
      date: formatDate(w.date, 'short'),
      weight: displayWeight(w.value),
      fullDate: w.date
    }))
  }, [weightMap, displayWeight])

  const physiqueWaistChartData = useMemo(() => {
    return waistHistory.map(w => ({
      date: formatDate(w.date, 'short'),
      waist: displayLength(w.value),
      fullDate: w.date
    }))
  }, [waistHistory, displayLength])

  const chestHistory = useMemo(() => {
    return measurements
      .filter(m => m.chestCm !== undefined && m.chestCm > 0)
      .map(m => ({ date: m.date, value: m.chestCm! }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [measurements])

  const armHistory = useMemo(() => {
    return measurements
      .filter(m => (m.leftArmCm !== undefined && m.leftArmCm > 0) || (m.rightArmCm !== undefined && m.rightArmCm > 0) || (m.armsCm !== undefined && m.armsCm > 0))
      .map(m => {
        let value = m.armsCm || 0
        if (m.leftArmCm && m.rightArmCm) {
          value = (m.leftArmCm + m.rightArmCm) / 2
        } else if (m.leftArmCm) {
          value = m.leftArmCm
        } else if (m.rightArmCm) {
          value = m.rightArmCm
        }
        return { date: m.date, value }
      })
      .filter(v => v.value > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [measurements])

  const physiqueChestChartData = useMemo(() => {
    return chestHistory.map(c => ({
      date: formatDate(c.date, 'short'),
      chest: displayLength(c.value),
      fullDate: c.date
    }))
  }, [chestHistory, displayLength])

  const physiqueArmChartData = useMemo(() => {
    return armHistory.map(a => ({
      date: formatDate(a.date, 'short'),
      arm: displayLength(a.value),
      fullDate: a.date
    }))
  }, [armHistory, displayLength])

  const weeklyPhysiqueChanges = useMemo(() => {
    const getMetricAtDaysAgo = (days: number, history: { date: string; value: number }[]) => {
      if (history.length === 0) return null
      const targetDateStr = daysAgo(days)
      let closest = history[0]
      let minDiff = Math.abs(new Date(closest.date).getTime() - new Date(targetDateStr).getTime())
      for (const h of history) {
        const diff = Math.abs(new Date(h.date).getTime() - new Date(targetDateStr).getTime())
        if (diff < minDiff) {
          closest = h
          minDiff = diff
        }
      }
      if (minDiff > 4 * 24 * 60 * 60 * 1000) return null
      return closest.value
    }

    const metrics = [
      { name: 'Weight', history: weightMap, unit: weightLabel, displayFn: displayWeight },
      { name: 'Waist', history: waistHistory, unit: lengthLabel, displayFn: displayLength },
      { name: 'Chest', history: chestHistory, unit: lengthLabel, displayFn: displayLength },
      { name: 'Arms (avg)', history: armHistory, unit: lengthLabel, displayFn: displayLength }
    ]

    const weeks = [
      { label: 'This Week (1-7d)', start: 7, end: 0 },
      { label: 'Last Week (8-14d)', start: 14, end: 7 },
      { label: '2 Weeks Ago (15-21d)', start: 21, end: 14 },
      { label: '3 Weeks Ago (22-28d)', start: 28, end: 21 }
    ]

    return weeks.map(w => {
      const rowMetrics = metrics.map(m => {
        const startVal = getMetricAtDaysAgo(w.start, m.history)
        const endVal = getMetricAtDaysAgo(w.end, m.history)
        let change: number | null = null
        if (startVal !== null && endVal !== null) {
          change = endVal - startVal
        }
        return {
          name: m.name,
          start: startVal ? m.displayFn(startVal) : null,
          end: endVal ? m.displayFn(endVal) : null,
          change: change !== null ? m.displayFn(change) : null,
          unit: m.unit
        }
      })
      return {
        label: w.label,
        metrics: rowMetrics
      }
    })
  }, [weightMap, waistHistory, chestHistory, armHistory, displayWeight, displayLength, weightLabel, lengthLabel])

  // Timeline classification history
  const classificationHistory = useMemo(() => {
    if (measurements.length < 2) return []
    const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date))
    const list: { date: string; status: string; confidence: number }[] = []
    
    for (let i = 1; i < sorted.length; i++) {
      const upToDate = sorted[i].date
      const subM = sorted.slice(0, i + 1)
      const subL = logs.filter(l => l.date <= upToDate)
      const subS = sessions.filter(s => s.date <= upToDate)
      const rep = getRecompositionReport(subM, subL, subS)
      
      if (rep.status !== 'insufficient_data') {
        list.push({
          date: upToDate,
          status: rep.status,
          confidence: rep.confidence
        })
      }
    }
    return list.reverse().slice(0, 10)
  }, [measurements, logs, sessions])

  // Monthly Summaries
  const monthlySummaries = useMemo(() => {
    const months: Record<string, { weightSum: number; weightCount: number; waistSum: number; waistCount: number; dates: string[] }> = {}
    
    weightMap.forEach(h => {
      const mKey = h.date.substring(0, 7)
      if (!months[mKey]) months[mKey] = { weightSum: 0, weightCount: 0, waistSum: 0, waistCount: 0, dates: [] }
      months[mKey].weightSum += h.value
      months[mKey].weightCount++
      months[mKey].dates.push(h.date)
    })
    
    waistHistory.forEach(h => {
      const mKey = h.date.substring(0, 7)
      if (!months[mKey]) months[mKey] = { weightSum: 0, weightCount: 0, waistSum: 0, waistCount: 0, dates: [] }
      months[mKey].waistSum += h.value
      months[mKey].waistCount++
      months[mKey].dates.push(h.date)
    })
    
    return Object.entries(months)
      .map(([mKey, data]) => {
        const avgWeight = data.weightCount > 0 ? data.weightSum / data.weightCount : null
        const avgWaist = data.waistCount > 0 ? data.waistSum / data.waistCount : null
        
        let status = 'insufficient_data'
        const sorted = [...data.dates].sort((a, b) => b.localeCompare(a))
        const latest = sorted[0]
        if (latest) {
          const subM = measurements.filter(m => m.date <= latest)
          const subL = logs.filter(l => l.date <= latest)
          const subS = sessions.filter(s => s.date <= latest)
          const rep = getRecompositionReport(subM, subL, subS)
          status = rep.status
        }
        
        const dateObj = new Date(mKey + '-02')
        const formattedMonth = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        return {
          mKey,
          name: formattedMonth,
          avgWeight: avgWeight ? displayWeight(avgWeight) : null,
          avgWaist: avgWaist ? displayLength(avgWaist) : null,
          status
        }
      })
      .sort((a, b) => b.mKey.localeCompare(a.mKey))
  }, [weightMap, waistHistory, measurements, logs, sessions, displayWeight, displayLength])

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1000 }}>
      {/* Top Header */}
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Progress</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Track weight, body measurements, and body composition analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowGoalModal(true)}>
            {activeGoal ? 'Edit Goal' : 'Set Goal'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowWeightModal(true)}>
            <Plus size={14} /> Log Weight
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, paddingBottom: 4 }}>
        <button
          onClick={() => setActiveTab('weight')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            fontWeight: activeTab === 'weight' ? 600 : 400,
            color: activeTab === 'weight' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'weight' ? '2.5px solid var(--accent)' : 'none',
            paddingBottom: 8,
            cursor: 'pointer'
          }}
        >
          Weight & Goals
        </button>
        <button
          onClick={() => setActiveTab('physique')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            fontWeight: activeTab === 'physique' ? 600 : 400,
            color: activeTab === 'physique' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'physique' ? '2.5px solid var(--accent)' : 'none',
            paddingBottom: 8,
            cursor: 'pointer'
          }}
        >
          Physique Analytics
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            fontWeight: activeTab === 'photos' ? 600 : 400,
            color: activeTab === 'photos' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'photos' ? '2.5px solid var(--accent)' : 'none',
            paddingBottom: 8,
            cursor: 'pointer'
          }}
        >
          Photo Timeline
        </button>
        <button
          onClick={() => setActiveTab('nutrition')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            fontWeight: activeTab === 'nutrition' ? 600 : 400,
            color: activeTab === 'nutrition' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'nutrition' ? '2.5px solid var(--accent)' : 'none',
            paddingBottom: 8,
            cursor: 'pointer'
          }}
        >
          Nutrition Analytics
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            fontWeight: activeTab === 'recovery' ? 600 : 400,
            color: activeTab === 'recovery' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'recovery' ? '2.5px solid var(--accent)' : 'none',
            paddingBottom: 8,
            cursor: 'pointer'
          }}
        >
          Recovery Trends
        </button>
      </div>

      {/* ─── TAB 1: Weight & Goals ─── */}
      {activeTab === 'weight' && (
        <>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Current Weight', value: latestWeight ? `${displayWeight(latestWeight.weightKg)} ${weightLabel}` : '—', icon: Scale, color: 'var(--accent)' },
              { label: 'Start Weight', value: activeGoal ? `${displayWeight(activeGoal.startWeight)} ${weightLabel}` : '—', icon: BarChart2, color: 'var(--blue)' },
              { label: 'Target Weight', value: activeGoal?.targetWeight ? `${displayWeight(activeGoal.targetWeight)} ${weightLabel}` : '—', icon: Scale, color: 'var(--emerald)' },
              { label: `${rangeDays}d Change`, value: trend !== null ? `${trend > 0 ? '+' : ''}${displayWeight(trend).toFixed(1)} ${weightLabel}` : '—', icon: trend !== null && trend < 0 ? TrendingDown : TrendingUp, color: trend !== null && trend < 0 ? 'var(--emerald)' : trend !== null && trend > 0 ? 'var(--red)' : 'var(--text-muted)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-elevated">
                <Icon size={16} color={color} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Goal Progress */}
          {activeGoal && (
            <div className="card-elevated" style={{ marginBottom: 20 }}>
              <div className="flex-between" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{activeGoal.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span className={`badge badge-${activeGoal.type === 'cut' ? 'red' : activeGoal.type === 'bulk' ? 'blue' : 'muted'}`} style={{ marginRight: 8 }}>
                      {activeGoal.type.toUpperCase()}
                    </span>
                    Started {formatDate(activeGoal.startDate, 'short')}
                    {activeGoal.targetDate && ` · Target {formatDate(activeGoal.targetDate, 'short')}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>{goalProgress}%</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>complete</div>
                </div>
              </div>
              <div style={{ height: 10, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${goalProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
                  borderRadius: 9999, transition: 'width 1s ease',
                  boxShadow: '0 0 12px rgba(163,230,53,0.3)',
                }} />
              </div>
              <div className="flex-between" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{displayWeight(activeGoal.startWeight)} {weightLabel}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{displayWeight(activeGoal.targetWeight || activeGoal.startWeight)} {weightLabel}</span>
              </div>
            </div>
          )}

          {/* Line Chart */}
          <div className="card-elevated" style={{ marginBottom: 20 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Weight History</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['7d', '30d', '90d'] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 13,
                      border: `1px solid ${range === r ? 'var(--accent)' : 'var(--border-default)'}`,
                      background: range === r ? 'var(--accent-bg)' : 'transparent',
                      color: range === r ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {rangeData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rangeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}${weightLabel}`}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip unitLabel={weightLabel} />} />
                  {activeGoal?.targetWeight && (
                    <Line
                      type="monotone" dataKey={() => displayWeight(activeGoal.targetWeight!)}
                      stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.5}
                      dot={false} strokeWidth={1.5}
                    />
                  )}
                  <Line
                    type="monotone" dataKey="weight"
                    stroke="var(--accent)" strokeWidth={2.5}
                    dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Scale size={24} /></div>
                <div className="empty-state-title">Not enough data</div>
                <div className="empty-state-desc">Log at least 2 weight entries to see your trend chart</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowWeightModal(true)}>
                  <Plus size={14} /> Log Weight
                </button>
              </div>
            )}
          </div>

          {/* History List */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16 }}>Weight Log</div>
            {sortedLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sortedLogs.map((log, i) => {
                  const prev = sortedLogs[i + 1]
                  const diff = prev ? log.weightKg - prev.weightKg : null
                  return (
                    <div key={log.id} className="flex-between" style={{ padding: '12px 0', borderBottom: i < sortedLogs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 15 }}>{displayWeight(log.weightKg)} {weightLabel}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(log.date, 'medium')}
                          {log.notes && ` · ${log.notes}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {diff !== null && (
                          <span style={{ fontSize: 12, color: diff < 0 ? 'var(--emerald)' : diff > 0 ? 'var(--red)' : 'var(--text-muted)', fontWeight: 500 }}>
                            {diff > 0 ? '+' : ''}{displayWeight(diff).toFixed(1)} {weightLabel}
                          </span>
                        )}
                        <button className="btn btn-ghost btn-icon-sm" onClick={() => deleteLog(log.id)}>
                          <Trash2 size={14} color="var(--text-muted)" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Scale size={24} /></div>
                <div className="empty-state-title">No weight logs</div>
                <div className="empty-state-desc">Start logging your weight daily to track progress</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowWeightModal(true)}>
                  <Plus size={14} /> Log Weight
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── TAB 2: Physique Analytics ─── */}
      {activeTab === 'physique' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Summary Overview */}
          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Status Summary */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 14 }}>Physique Status</div>
              
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <div>
                  <span 
                    className="badge" 
                    style={{ 
                      backgroundColor: STATUS_META[recompReport.status]?.bg || 'var(--bg-muted)', 
                      color: STATUS_META[recompReport.status]?.color || 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 13,
                      padding: '4px 10px',
                      borderRadius: 6
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{STATUS_META[recompReport.status]?.icon}</span>
                    {STATUS_META[recompReport.status]?.label || recompReport.status}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                    {recompReport.status === 'insufficient_data' ? '—' : `${recompReport.confidence}%`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Confidence Score</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {recompReport.explanation}
              </p>
            </div>

            {/* Estimated Body Fat & 30d changes */}
            <div className="card-elevated" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Trend Summary</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Body Fat Trend</span>
                  <span 
                    className="badge" 
                    style={{ 
                      fontWeight: 600, 
                      fontSize: 12,
                      color: recompReport.bodyFatTrend === 'decreasing' ? 'var(--emerald)' : recompReport.bodyFatTrend === 'increasing' ? 'var(--red)' : 'var(--amber)'
                    }}
                  >
                    {recompReport.bodyFatTrend.toUpperCase()}
                  </span>
                </div>
                <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Weight Trend (30d)</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {recompReport.weightTrend.change !== null 
                      ? `${recompReport.weightTrend.change > 0 ? '+' : ''}${displayWeight(recompReport.weightTrend.change).toFixed(1)} ${weightLabel}`
                      : '—'
                    }
                  </span>
                </div>
                <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Waist Trend (30d)</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {recompReport.waistTrend.change !== null 
                      ? `${recompReport.waistTrend.change > 0 ? '+' : ''}${displayLength(recompReport.waistTrend.change).toFixed(1)} ${lengthLabel}`
                      : '—'
                    }
                  </span>
                </div>
                <div className="flex-between">
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avg Strength Change (30d)</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--emerald)' }}>
                    {recompReport.strengthTrend.avgStrengthChange !== null 
                      ? `${recompReport.strengthTrend.avgStrengthChange > 0 ? '+' : ''}${recompReport.strengthTrend.avgStrengthChange}%`
                      : '—'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row - 2x2 Grid */}
          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Weight Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 14 }}>Weight Trend History</div>
              {physiqueWeightChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={physiqueWeightChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}${weightLabel}`}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip unitLabel={weightLabel} />} />
                    <Line
                      type="monotone" dataKey="weight"
                      stroke="var(--accent)" strokeWidth={2}
                      dot={{ fill: 'var(--accent)', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <Scale size={20} color="var(--text-muted)" />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Log multiple weights to load chart</div>
                </div>
              )}
            </div>

            {/* Waist Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 14 }}>Waist Circumference History</div>
              {physiqueWaistChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={physiqueWaistChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}${lengthLabel}`}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip unitLabel={lengthLabel} />} />
                    <Line
                      type="monotone" dataKey="waist"
                      stroke="var(--blue)" strokeWidth={2}
                      dot={{ fill: 'var(--blue)', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <Ruler size={20} color="var(--text-muted)" />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Log multiple waist measurements to load chart</div>
                </div>
              )}
            </div>

            {/* Chest Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 14 }}>Chest circumference History</div>
              {physiqueChestChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={physiqueChestChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}${lengthLabel}`}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip unitLabel={lengthLabel} />} />
                    <Line
                      type="monotone" dataKey="chest"
                      stroke="var(--emerald)" strokeWidth={2}
                      dot={{ fill: 'var(--emerald)', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <Ruler size={20} color="var(--text-muted)" />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Log multiple chest measurements to load chart</div>
                </div>
              )}
            </div>

            {/* Arm Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 14 }}>Arm circumference History</div>
              {physiqueArmChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={physiqueArmChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}${lengthLabel}`}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip unitLabel={lengthLabel} />} />
                    <Line
                      type="monotone" dataKey="arm"
                      stroke="var(--purple)" strokeWidth={2}
                      dot={{ fill: 'var(--purple)', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <Ruler size={20} color="var(--text-muted)" />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Log arm measurements (left/right) to load chart</div>
                </div>
              )}
            </div>
          </div>

          {/* Weekly changes comparison */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--accent)" />
              <span>Weekly Physique Delta Comparison</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Metric</th>
                    {weeklyPhysiqueChanges.map((w, idx) => (
                      <th key={idx} style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Weight', 'Waist', 'Chest', 'Arms (avg)'].map((mName, mIdx) => (
                    <tr key={mName} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{mName}</td>
                      {weeklyPhysiqueChanges.map((w, wIdx) => {
                        const m = w.metrics[mIdx]
                        const isNeg = m.change !== null && m.change < 0
                        const isPos = m.change !== null && m.change > 0
                        const color = isNeg ? 'var(--emerald)' : isPos ? 'var(--red)' : 'var(--text-muted)'
                        return (
                          <td key={wIdx} style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {m.start !== null && m.end !== null ? (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>
                                  {m.start.toFixed(1)} → {m.end.toFixed(1)} {m.unit}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>
                                  {m.change !== null ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(1)} ${m.unit}` : '—'}
                                </div>
                              </div>
                            ) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Classification History Timeline */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} color="var(--accent)" />
              <span>Classification History Timeline</span>
            </div>
            
            {classificationHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {classificationHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex-between"
                    style={{ 
                      padding: '10px 12px', 
                      background: 'var(--bg-muted)', 
                      borderRadius: 8,
                      borderLeft: `3.5px solid ${STATUS_META[item.status]?.color || 'var(--border-default)'}`
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.date, 'medium')}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {STATUS_META[item.status]?.label || item.status}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Confidence: {item.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No classification history available. Log measurements consistently.</div>
              </div>
            )}
          </div>

          {/* Monthly Summaries */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="var(--blue)" />
              <span>Monthly Progress Summaries</span>
            </div>

            {monthlySummaries.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Month</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Avg Weight</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Avg Waist</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Final Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaries.map((summary) => (
                      <tr key={summary.mKey} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{summary.name}</td>
                        <td style={{ padding: '10px 12px' }}>{summary.avgWeight ? `${summary.avgWeight} ${weightLabel}` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{summary.avgWaist ? `${summary.avgWaist} ${lengthLabel}` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span 
                            style={{ 
                              color: STATUS_META[summary.status]?.color || 'var(--text-primary)',
                              fontWeight: 600,
                              fontSize: 12
                            }}
                          >
                            {STATUS_META[summary.status]?.label || summary.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No monthly summaries available. Log measurements to begin.</div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 3: Nutrition Analytics ─── */}
      {activeTab === 'nutrition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Nutrition Status / Recommendations */}
          <div className="card-elevated" style={{ borderLeft: '4px solid var(--amber)' }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Nutrition Coach Recommendations</div>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: NUTRITION_STATUS_META[nutritionRecommendation.status]?.bg || 'rgba(245,158,11,0.1)', 
                    color: NUTRITION_STATUS_META[nutritionRecommendation.status]?.color || 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: 13,
                    padding: '4px 10px',
                    borderRadius: 6
                  }}
                >
                  <span style={{ marginRight: 4 }}>{NUTRITION_STATUS_META[nutritionRecommendation.status]?.icon}</span>
                  {NUTRITION_STATUS_META[nutritionRecommendation.status]?.label || nutritionRecommendation.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  Confidence: {nutritionRecommendation.confidence}%
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {nutritionRecommendation.reason}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Calorie Target</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {nutritionRecommendation.currentCalories} kcal → <span style={{ color: 'var(--accent)' }}>{nutritionRecommendation.recommendedCalories} kcal</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Protein Target</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {nutritionRecommendation.currentProtein}g → <span style={{ color: 'var(--accent)' }}>{nutritionRecommendation.recommendedProtein}g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="card-elevated">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>7d Average Calories</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {nutritionAnalytics.avgCalories7d} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>kcal</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Target: {activeGoal?.calorieTarget || 2000} kcal
              </div>
            </div>

            <div className="card-elevated">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>7d Average Protein</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {nutritionAnalytics.avgProtein7d} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>g</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Target: {activeGoal?.proteinTarget || 150}g
              </div>
            </div>

            <div className="card-elevated">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Calorie Adherence (7d / 30d)</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--macro-calories)' }}>
                {nutritionAnalytics.calorieAdherence7d}% <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-muted)' }}>/ {nutritionAnalytics.calorieAdherence30d}%</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Days within ±10% of target
              </div>
            </div>

            <div className="card-elevated">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Protein Adherence (7d / 30d)</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--macro-protein)' }}>
                {nutritionAnalytics.proteinAdherence7d}% <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-muted)' }}>/ {nutritionAnalytics.proteinAdherence30d}%</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Days with ≥90% of target
              </div>
            </div>
          </div>

          {/* Charts section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
            {/* Calorie Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 16 }}>Calorie Intake History</div>
              <div style={{ height: 250, width: '100%' }}>
                {nutritionAnalytics.dailyHistory.length >= 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nutritionAnalytics.dailyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v} kcal`}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip unitLabel="kcal" />} />
                      {activeGoal && (
                        <Line
                          type="monotone" dataKey={() => activeGoal.calorieTarget}
                          stroke="var(--macro-calories)" strokeDasharray="4 4" strokeOpacity={0.6}
                          dot={false} strokeWidth={1.5}
                        />
                      )}
                      <Line
                        type="monotone" dataKey="calories"
                        stroke="var(--macro-calories)" strokeWidth={2.5}
                        dot={{ fill: 'var(--macro-calories)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-title">No log history</div>
                    <div className="empty-state-desc">Log your meals on the Food page to see your intake chart</div>
                  </div>
                )}
              </div>
            </div>

            {/* Protein Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 16 }}>Protein Intake History</div>
              <div style={{ height: 250, width: '100%' }}>
                {nutritionAnalytics.dailyHistory.length >= 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nutritionAnalytics.dailyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v}g`}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip unitLabel="g" />} />
                      {activeGoal && (
                        <Line
                          type="monotone" dataKey={() => activeGoal.proteinTarget}
                          stroke="var(--macro-protein)" strokeDasharray="4 4" strokeOpacity={0.6}
                          dot={false} strokeWidth={1.5}
                        />
                      )}
                      <Line
                        type="monotone" dataKey="protein"
                        stroke="var(--macro-protein)" strokeWidth={2.5}
                        dot={{ fill: 'var(--macro-protein)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-title">No log history</div>
                    <div className="empty-state-desc">Log your meals on the Food page to see your intake chart</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daily intake log history summary table */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16 }}>Intake History Log</div>
            {nutritionAnalytics.dailyHistory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Calories</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Protein</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Carbs</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Fat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...nutritionAnalytics.dailyHistory].reverse().slice(0, 15).map((log) => (
                      <tr key={log.date} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{formatDate(log.date, 'medium')}</td>
                        <td style={{ padding: '10px 12px' }}>{log.calories} kcal</td>
                        <td style={{ padding: '10px 12px' }}>{log.protein}g</td>
                        <td style={{ padding: '10px 12px' }}>{log.carbs}g</td>
                        <td style={{ padding: '10px 12px' }}>{log.fat}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No logged nutrition history found.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: Recovery Trends ─── */}
      {activeTab === 'recovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recovery Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: '7d Avg Sleep', value: `${recoveryAnalytics.avgSleep} hrs`, icon: Moon, color: 'var(--blue)' },
              { label: '7d Avg Steps', value: recoveryAnalytics.avgSteps !== '—' ? `${recoveryAnalytics.avgSteps.toLocaleString()} steps` : '—', icon: Footprints, color: 'var(--emerald)' },
              { label: '7d Avg Mood', value: recoveryAnalytics.avgMood !== '—' ? `${recoveryAnalytics.avgMood}/5` : '—', icon: Heart, color: 'var(--accent)' },
              { label: '7d Avg Energy', value: recoveryAnalytics.avgEnergy !== '—' ? `${recoveryAnalytics.avgEnergy}/5` : '—', icon: Activity, color: 'var(--amber)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-elevated">
                <Icon size={16} color={color} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Recovery Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
            {/* Sleep Trend Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 16 }}>Sleep Duration Trend ({range})</div>
              <div style={{ height: 220, width: '100%' }}>
                {recoveryAnalytics.chartData.length >= 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryAnalytics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v}h`}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip unitLabel="hrs" />} />
                      <Line
                        type="monotone" dataKey="sleep"
                        stroke="var(--blue)" strokeWidth={2.5}
                        dot={{ fill: 'var(--blue)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-title">No recovery logs</div>
                    <div className="empty-state-desc">Log your sleep and recovery metrics to see trends here.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Steps Trend Chart */}
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 16 }}>Daily Steps Trend ({range})</div>
              <div style={{ height: 220, width: '100%' }}>
                {recoveryAnalytics.chartData.length >= 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryAnalytics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip unitLabel="steps" />} />
                      <Line
                        type="monotone" dataKey="steps"
                        stroke="var(--emerald)" strokeWidth={2.5}
                        dot={{ fill: 'var(--emerald)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-title">No recovery logs</div>
                    <div className="empty-state-desc">Log steps to see trends here.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mood, Energy & Soreness Chart */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16 }}>Mood, Energy & Muscle Soreness Correlations ({range})</div>
            <div style={{ height: 220, width: '100%' }}>
              {recoveryAnalytics.chartData.length >= 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recoveryAnalytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[1, 5]}
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickLine={false} axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip unitLabel="/5" />} />
                    <Line
                      type="monotone" dataKey="mood" name="Mood"
                      stroke="var(--accent)" strokeWidth={2}
                      dot={{ fill: 'var(--accent)', r: 2 }}
                    />
                    <Line
                      type="monotone" dataKey="energy" name="Energy"
                      stroke="var(--amber)" strokeWidth={2}
                      dot={{ fill: 'var(--amber)', r: 2 }}
                    />
                    <Line
                      type="monotone" dataKey="soreness" name="Soreness"
                      stroke="var(--red)" strokeWidth={2}
                      dot={{ fill: 'var(--red)', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-title">No recovery logs</div>
                </div>
              )}
            </div>
          </div>

          {/* Recovery Log Table */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16 }}>Recovery Log History</div>
            {recoveryAnalytics.history.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Sleep</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Steps</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Mood</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Energy</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Soreness</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Notes</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recoveryAnalytics.history.slice(0, 15).map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{formatDate(log.date, 'medium')}</td>
                        <td style={{ padding: '10px 12px' }}>{log.sleepHours !== null ? `${log.sleepHours} hrs` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{log.dailySteps !== null ? log.dailySteps.toLocaleString() : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{log.mood !== null ? `${log.mood}/5` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{log.energy !== null ? `${log.energy}/5` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{log.muscleSoreness !== null ? `${log.muscleSoreness}/5` : '—'}</td>
                        <td style={{ padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes || ''}>
                          {log.notes || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button className="btn btn-ghost btn-icon-sm" onClick={() => deleteRecoveryLog(log.id)}>
                            <Trash2 size={13} color="var(--text-muted)" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recovery logs logged yet.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: Photo Timeline ─── */}
      {activeTab === 'photos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload Photo Form */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={16} color="var(--accent)" />
              <span>Log Progress Photo</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <div className="input-group" style={{ minWidth: 150, flex: 1 }}>
                <label className="input-label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ minWidth: 150, flex: 1 }}>
                <label className="input-label">Angle</label>
                <select
                  className="input"
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value as 'front' | 'left' | 'right' | 'back')}
                >
                  <option value="front">Front View</option>
                  <option value="left">Left Side</option>
                  <option value="right">Right Side</option>
                  <option value="back">Back View</option>
                </select>
              </div>

              <div className="input-group" style={{ minWidth: 220, flex: 2 }}>
                <label className="input-label">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., waking, empty stomach, flexed"
                  className="input"
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
                  <Plus size={16} /> Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Photos Timeline View */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 20 }}>Visual Timeline</div>

            {groupedPhotos.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {groupedPhotos.map(([dateStr, angles]) => (
                  <div key={dateStr} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {formatDate(dateStr, 'medium')}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                      {(['front', 'left', 'right', 'back'] as const).map((angle) => {
                        const item = angles[angle]
                        return (
                          <div 
                            key={angle} 
                            style={{ 
                              background: 'var(--bg-base)', 
                              borderRadius: 12, 
                              border: '1px solid var(--border-subtle)', 
                              padding: 8, 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 8, 
                              position: 'relative' 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                {angle}
                              </span>
                              {item && (
                                <button 
                                  onClick={() => {
                                    if (confirm('Delete this progress photo?')) {
                                      deletePhoto(item.id)
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                  title="Delete photo"
                                >
                                  <Trash2 size={12} color="var(--red)" style={{ opacity: 0.7 }} />
                                </button>
                              )}
                            </div>

                            {item ? (
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', background: '#000', cursor: 'zoom-in' }} onClick={() => setSelectedExpandPhoto(item.photoData)}>
                                <img 
                                  src={item.photoData} 
                                  alt={`${angle} view on ${dateStr}`} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                                {item.notes && (
                                  <div 
                                    style={{ 
                                      position: 'absolute', 
                                      bottom: 0, 
                                      left: 0, 
                                      right: 0, 
                                      background: 'rgba(0,0,0,0.6)', 
                                      padding: '4px 8px', 
                                      fontSize: 10, 
                                      color: '#fff', 
                                      whiteSpace: 'nowrap', 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis' 
                                    }}
                                    title={item.notes}
                                  >
                                    {item.notes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                style={{ 
                                  width: '100%', 
                                  aspectRatio: '3/4', 
                                  borderRadius: 8, 
                                  background: 'var(--bg-muted)', 
                                  border: '1px dashed var(--border-default)', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: 6,
                                  color: 'var(--text-muted)'
                                }}
                              >
                                <Camera size={18} />
                                <span style={{ fontSize: 10 }}>Not Logged</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <div className="empty-state-title">No photos logged yet</div>
                <div className="empty-state-desc">Upload your front, side, and back photos to track visual body composition changes.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedExpandPhoto}
        onClose={() => setSelectedExpandPhoto(null)}
        maxWidth={640}
        title="Progress Photo"
      >
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img 
            src={selectedExpandPhoto || ''} 
            alt="Expanded Progress" 
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }} 
          />
        </div>
      </Modal>

      {showWeightModal && <WeightLogModal onClose={() => setShowWeightModal(false)} />}
      {showGoalModal && <GoalSetupModal onClose={() => setShowGoalModal(false)} />}
    </div>
  )
}
