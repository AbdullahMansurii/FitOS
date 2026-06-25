import { useState, useEffect, useRef, useMemo } from 'react'
import { Dumbbell, Play, CheckCircle, Timer, Trophy, X, RotateCcw, Plus, Trash2, Edit3, Copy, ArrowUp, ArrowDown, Search, BarChart2, AlertTriangle } from 'lucide-react'
import { useWorkoutStore, useSettingsStore, useGoalsStore } from '@/store/index'
import { todayISO, formatDate, formatDuration, calcEstimated1RM, generateId } from '@/lib/utils'
import type { WorkoutTemplate, WorkoutTemplateExercise, SessionExercise, ExerciseSet, Exercise, ProgressionRecommendation } from '@/types'
import { searchExercises } from '@/lib/exerciseSearch'
import { getCachedRecommendation } from '@/lib/progressiveOverload'
import { getExerciseIntelligence } from '@/lib/exerciseIntelligence'

type WorkoutTab = 'templates' | 'history' | 'exercises'

export function WorkoutPage() {
  const templates = useWorkoutStore((s) => s.templates)
  const sessions = useWorkoutStore((s) => s.sessions)
  const exercises = useWorkoutStore((s) => s.exercises)
  const activeSession = useWorkoutStore((s) => s.activeSession)
  const startSession = useWorkoutStore((s) => s.startSession)
  const completeSession = useWorkoutStore((s) => s.completeSession)
  const cancelSession = useWorkoutStore((s) => s.cancelSession)
  const addSetToSession = useWorkoutStore((s) => s.addSetToSession)
  const deleteSetFromSession = useWorkoutStore((s) => s.deleteSetFromSession)
  const getPRForExercise = useWorkoutStore((s) => s.getPRForExercise)
  const addTemplate = useWorkoutStore((s) => s.addTemplate)
  const updateTemplate = useWorkoutStore((s) => s.updateTemplate)
  const deleteTemplate = useWorkoutStore((s) => s.deleteTemplate)
  const duplicateTemplate = useWorkoutStore((s) => s.duplicateTemplate)
  const addExercise = useWorkoutStore((s) => s.addExercise)
  const deleteExercise = useWorkoutStore((s) => s.deleteExercise)

  const getActiveGoal = useGoalsStore((s) => s.getActiveGoal)
  const activeGoal = getActiveGoal()
  const settings = useSettingsStore((s) => s.settings)
  
  const [tab, setTab] = useState<WorkoutTab>('templates')
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [sessionRating, setSessionRating] = useState(0)
  const [sessionNotes, setSessionNotes] = useState('')
  
  // Custom Workout Editor states
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  
  // Custom Exercise Creator states
  const [showExModal, setShowExModal] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExCategory, setNewExCategory] = useState<Exercise['category']>('strength')
  const [newExEquipment, setNewExEquipment] = useState('')
  const [newExMuscles, setNewExMuscles] = useState<string[]>([])
  const [newExInstructions, setNewExInstructions] = useState('')
  const [exercisesSearchQuery, setExercisesSearchQuery] = useState('')
  
  // Dedicated analytics modal state
  const [selectedAnalyticsExId, setSelectedAnalyticsExId] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({})

  // Resolve training goal style
  const trainingGoal = useMemo(() => {
    if (!activeGoal) return 'hypertrophy'
    const name = activeGoal.name.toLowerCase()
    if (name.includes('strength') || name.includes('power') || name.includes('lift')) {
      return 'strength'
    }
    if (activeGoal.type === 'maintain') {
      return 'maintenance'
    }
    return 'hypertrophy'
  }, [activeGoal])

  // Caching progressive overload recommendations by exerciseId
  const recommendationsMap = useMemo(() => {
    const map: Record<string, ProgressionRecommendation> = {}
    const trainedIds = new Set<string>()
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (ex.exerciseId) trainedIds.add(ex.exerciseId)
      })
    })

    if (activeSession) {
      activeSession.exercises.forEach(ex => {
        if (ex.exerciseId) trainedIds.add(ex.exerciseId)
      })
    }

    if (selectedAnalyticsExId) {
      trainedIds.add(selectedAnalyticsExId)
    }

    exercises.forEach((ex) => {
      if (trainedIds.has(ex.id)) {
        map[ex.id] = getCachedRecommendation(ex.id, sessions, trainingGoal)
      } else {
        map[ex.id] = {
          exerciseId: ex.id,
          recommendationType: 'insufficient_data',
          recommendation: 'insufficient_data',
          message: 'No history exists.',
          suggestedWeightKg: null,
          suggestedWeight: null,
          suggestedRepTarget: null,
          suggestedReps: null,
          confidence: 'low',
          reasoning: [],
          currentPeakE1RM: null,
          currentVolume: null,
          projectedE1RM: null,
          projectedVolume: null,
          stallDetected: false,
          potentialPR: false,
          readinessScore: 0,
          volumeImproving: false,
          fatigueWarning: false,
          daysSinceLastSession: null,
          weeklyFrequency: 0,
          reason: 'No history exists.'
        }
      }
    })
    return map
  }, [exercises, sessions, trainingGoal, activeSession, selectedAnalyticsExId])

  const handleStartSession = (template: WorkoutTemplate) => {
    startSession({
      templateId: template.id,
      name: template.name,
      date: todayISO(),
      startedAt: new Date().toISOString(),
      exercises: template.exercises.map((te) => ({
        id: `se_${te.id}`,
        sessionId: '',
        exerciseId: te.exerciseId,
        exercise: te.exercise,
        orderIndex: te.orderIndex,
        sets: [],
      })),
    })
  }

  const handleCompleteSession = () => {
    completeSession(sessionNotes, sessionRating || undefined)
    setShowCompleteModal(false)
    setSessionRating(0)
    setSessionNotes('')
  }

  const handleSaveTemplate = (templateData: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string, createdAt?: string }) => {
    if (templateData.id) {
      updateTemplate(templateData.id, templateData)
    } else {
      addTemplate(templateData)
    }
    setIsEditingTemplate(false)
    setEditingTemplate(null)
  }

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExName.trim()) return
    
    addExercise({
      name: newExName.trim(),
      category: newExCategory,
      muscleGroups: newExMuscles.length > 0 ? newExMuscles : ['Other'],
      equipment: newExEquipment.trim() || undefined,
      instructions: newExInstructions.trim() || undefined,
      isCustom: true,
    })

    // Reset form
    setNewExName('')
    setNewExCategory('strength')
    setNewExEquipment('')
    setNewExMuscles([])
    setNewExInstructions('')
    setShowExModal(false)
  }

  const toggleMuscleSelection = (muscle: string) => {
    setNewExMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    )
  }

  // ─── Active session view ────────────────────────────────────────────────────

  if (activeSession) {
    return (
      <div className="page-container animate-fade-in" style={{ maxWidth: 700 }}>
        <div className="flex-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{activeSession.name}</h1>
            <SessionTimer startedAt={activeSession.startedAt!} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={cancelSession}>
              <X size={14} /> Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCompleteModal(true)}>
              <CheckCircle size={14} /> Finish
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeSession.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              sessionExercise={ex}
              onAddSet={(setData) => addSetToSession(ex.id, setData)}
              onDeleteSet={(setId) => deleteSetFromSession(ex.id, setId)}
              personalRecord={getPRForExercise(ex.exerciseId)}
              defaultRest={settings.restTimerDefault}
              prevSets={sessions
                .flatMap((s) => s.exercises)
                .filter((se) => se.exerciseId === ex.exerciseId)
                .slice(0, 3)
                .flatMap((se) => se.sets)
              }
              recommendation={recommendationsMap[ex.exerciseId]}
            />
          ))}
        </div>

        {showCompleteModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Complete Workout</h2>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Rate this session</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} onClick={() => setSessionRating(s)} style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', opacity: s <= sessionRating ? 1 : 0.3, transition: '0.15s' }}>★</button>
                  ))}
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label className="input-label">Notes (optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did it go?"
                  style={{ resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowCompleteModal(false)} style={{ flex: 1 }}>Back</button>
                <button className="btn btn-primary" onClick={handleCompleteSession} style={{ flex: 2 }}>
                  <CheckCircle size={14} /> Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Template Editor Mode ───────────────────────────────────────────────────

  if (isEditingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        exercisesLibrary={exercises}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setIsEditingTemplate(false)
          setEditingTemplate(null)
        }}
      />
    )
  }

  // ─── Normal view ────────────────────────────────────────────────────────────

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 900 }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Workout</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Train, track, and progress</p>
        </div>
        {tab === 'templates' && (
          <button className="btn btn-primary" onClick={() => {
            setEditingTemplate(null)
            setIsEditingTemplate(true)
          }}>
            <Plus size={16} /> Custom Workout
          </button>
        )}
        {tab === 'exercises' && (
          <button className="btn btn-primary" onClick={() => setShowExModal(true)}>
            <Plus size={16} /> Custom Exercise
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-elevated)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {(['templates', 'history', 'exercises'] as WorkoutTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              background: tab === t ? 'var(--bg-surface)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onStart={() => handleStartSession(template)}
              onEdit={() => {
                setEditingTemplate(template)
                setIsEditingTemplate(true)
              }}
              onDuplicate={() => duplicateTemplate(template.id)}
              onDelete={() => {
                if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                  deleteTemplate(template.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Dumbbell size={24} /></div>
              <div className="empty-state-title">No sessions yet</div>
              <div className="empty-state-desc">Complete your first workout to see history here</div>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="card-elevated">
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{session.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                      {formatDate(session.date, 'medium')}
                      {session.durationSeconds && ` · ${formatDuration(session.durationSeconds)}`}
                      {session.totalVolume && ` · ${Math.round(session.totalVolume)}kg total`}
                    </div>
                  </div>
                  {session.rating && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ fontSize: 14, color: s <= session.rating! ? 'var(--accent)' : 'var(--bg-muted)' }}>★</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {session.exercises.map((ex) => (
                    <span key={ex.id} className="badge badge-muted" style={{ fontSize: 12 }}>
                      {ex.exercise?.name} ({ex.sets.length} sets)
                    </span>
                  ))}
                </div>
                {session.notes && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    "{session.notes}"
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedSessions(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                    style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    data-testid={`toggle-details-${session.id}`}
                  >
                    {expandedSessions[session.id] ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {expandedSessions[session.id] && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="session-details">
                    {session.exercises.map((ex) => (
                      <div key={ex.id} style={{ borderBottom: '1px solid var(--bg-muted)', paddingBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
                          {ex.exercise?.name || 'Unknown Exercise'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {ex.sets.map((set, idx) => (
                            <div
                              key={set.id}
                              style={{
                                fontSize: 12, padding: '4px 8px', borderRadius: 6,
                                background: set.isWarmup ? 'var(--amber-bg)' : 'var(--bg-base)',
                                color: set.isWarmup ? 'var(--amber)' : 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <span>{set.isWarmup ? 'W' : idx + 1}: <strong>{set.weightKg}kg × {set.reps}</strong></span>
                              {set.isPR && <Trophy size={11} color="var(--accent)" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'exercises' && (
        <div>
          {/* Exercises search bar */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Search exercises..."
              value={exercisesSearchQuery}
              onChange={(e) => setExercisesSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: 40 }}
            />
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            {exercisesSearchQuery && (
              <button
                onClick={() => setExercisesSearchQuery('')}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searchExercises(exercises, exercisesSearchQuery).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px dashed var(--border-default)' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 14, fontSize: 14 }}>
                No exercises found matching "{exercisesSearchQuery}"
              </div>
              {exercisesSearchQuery.trim() && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    addExercise({
                      name: exercisesSearchQuery.trim(),
                      category: 'strength',
                      muscleGroups: ['Other'],
                      isCustom: true
                    })
                    setExercisesSearchQuery('')
                  }}
                >
                  <Plus size={14} /> Create Custom Exercise: {exercisesSearchQuery}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {searchExercises(exercises, exercisesSearchQuery).map((ex) => (
                <div key={ex.id} className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div>
                      {ex.isCustom && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete custom exercise "${ex.name}"?`)) {
                              deleteExercise(ex.id)
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 2, opacity: 0.7 }}
                          title="Delete Custom Exercise"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ex.muscleGroups.join(', ')}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{ex.category}</span>
                      {ex.equipment && <span className="badge badge-muted" style={{ fontSize: 10 }}>{ex.equipment}</span>}
                      {ex.isCustom && <span className="badge badge-amber" style={{ fontSize: 10 }}>Custom</span>}
                      {recommendationsMap[ex.id]?.fatigueWarning && (
                        <span className="badge badge-red" style={{ fontSize: 9 }}>⚠ Fatigue</span>
                      )}
                      {recommendationsMap[ex.id]?.stallDetected && (
                        <span className="badge badge-amber" style={{ fontSize: 9 }}>⚠ Plateau</span>
                      )}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedAnalyticsExId(ex.id)}
                      style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      title="View Exercise Analytics"
                    >
                      <BarChart2 size={12} /> Analytics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Exercise Modal */}
      {showExModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form className="card-glass animate-fade-in" onSubmit={handleCreateExercise} style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Create Custom Exercise</h2>
            
            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Exercise Name</label>
              <input
                className="input"
                type="text"
                required
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                placeholder="e.g., Incline Hammer Press"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Category</label>
                <select
                  className="input"
                  value={newExCategory}
                  onChange={(e) => setNewExCategory(e.target.value as Exercise['category'])}
                >
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="sport">Sport</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Equipment</label>
                <input
                  className="input"
                  type="text"
                  value={newExEquipment}
                  onChange={(e) => setNewExEquipment(e.target.value)}
                  placeholder="e.g., Dumbbell, Barbell"
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label" style={{ marginBottom: 8 }}>Target Muscle Groups</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 110, overflowY: 'auto', padding: 4, background: 'var(--bg-base)', borderRadius: 8 }}>
                {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Core', 'Cardiovascular'].map((muscle) => (
                  <label key={muscle} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', padding: 2 }}>
                    <input
                      type="checkbox"
                      checked={newExMuscles.includes(muscle)}
                      onChange={() => toggleMuscleSelection(muscle)}
                    />
                    {muscle}
                  </label>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Instructions / Description</label>
              <textarea
                className="input"
                rows={3}
                value={newExInstructions}
                onChange={(e) => setNewExInstructions(e.target.value)}
                placeholder="Optional instructions..."
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowExModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save Exercise</button>
            </div>
          </form>
        </div>
      )}

      {/* Exercise Analytics Modal */}
      {selectedAnalyticsExId && (() => {
        const ex = exercises.find(e => e.id === selectedAnalyticsExId)
        if (!ex) return null
        const intel = getExerciseIntelligence(selectedAnalyticsExId, sessions)
        const rec = recommendationsMap[selectedAnalyticsExId]

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} data-testid="analytics-modal">
            <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{ex.name}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ex.muscleGroups.join(', ')} · {ex.equipment || 'No Equipment'}</div>
                </div>
                <button
                  onClick={() => setSelectedAnalyticsExId(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Warnings inside analytics modal */}
              {rec?.fatigueWarning && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} color="var(--red)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>⚠ Recovery Warning</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Strength and training volume have declined over multiple sessions. Focus on recovery, sleep, and nutrition.
                    </div>
                  </div>
                </div>
              )}

              {rec?.stallDetected && (
                <div style={{
                  background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--amber)' }}>⚠ Plateau Detected</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Performance has stagnated. Recommended Deload: <strong>{rec.suggestedWeight ?? 0}kg</strong>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* 1. Current PRs */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Current PRs
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best Weight</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {intel.personalRecords.heaviestWeight ? `${intel.personalRecords.heaviestWeight.value} kg` : '—'}
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best Volume</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {intel.personalRecords.highestVolume ? `${Math.round(intel.personalRecords.highestVolume.value)} kg` : '—'}
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best e1RM</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {intel.personalRecords.highestE1RM ? `${Math.round(intel.personalRecords.highestE1RM.value)} kg` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 30-Day Trends */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 8 }}>
                    30-Day Trends
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>e1RM Trend</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: intel.trends30d.e1rmPctChange === null ? 'var(--text-primary)' : intel.trends30d.e1rmPctChange >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                        {intel.trends30d.e1rmPctChange !== null ? `${intel.trends30d.e1rmPctChange >= 0 ? '+' : ''}${intel.trends30d.e1rmPctChange}%` : 'Need 2+ logs'}
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volume Trend</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: intel.trends30d.volumePctChange === null ? 'var(--text-primary)' : intel.trends30d.volumePctChange >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                        {intel.trends30d.volumePctChange !== null ? `${intel.trends30d.volumePctChange >= 0 ? '+' : ''}${intel.trends30d.volumePctChange}%` : 'Need 2+ logs'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Progressive Overload */}
                {rec && rec.recommendationType !== 'insufficient_data' && (
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Progressive Overload
                    </h3>
                    <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                        {rec.recommendationType.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Suggested Target: <strong>{rec.suggestedWeight}kg × {rec.suggestedReps} reps</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        <div>Readiness: <strong style={{ color: rec.readinessScore >= 75 ? 'var(--emerald)' : 'var(--amber)' }}>{rec.readinessScore}/100</strong></div>
                        <div>Confidence: <strong style={{ color: rec.confidence === 'high' ? 'var(--emerald)' : 'var(--accent)' }}>{rec.confidence.toUpperCase()}</strong></div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '6px 10px', borderRadius: 6, lineHeight: 1.4, marginTop: 10 }}>
                        {rec.reason}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Recovery Status */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Recovery Status
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Fatigue Flag</span>
                      <span style={{ fontWeight: 600, color: rec?.fatigueWarning ? 'var(--red)' : 'var(--emerald)' }}>
                        {rec?.fatigueWarning ? 'HIGH FATIGUE' : 'Nominal'}
                      </span>
                    </div>
                    <div className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Plateau Detected</span>
                      <span style={{ fontWeight: 600, color: rec?.stallDetected ? 'var(--amber)' : 'var(--emerald)' }}>
                        {rec?.stallDetected ? 'STALLING' : 'No'}
                      </span>
                    </div>
                    <div className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Weekly Frequency</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec ? `${rec.weeklyFrequency.toFixed(1)} sessions/week` : '0 sessions/week'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Template Card ───────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: WorkoutTemplate
  onStart: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function TemplateCard({ template, onStart, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const SPLIT_COLORS: Record<string, string> = {
    push: 'var(--red)', pull: 'var(--blue)', legs: 'var(--emerald)',
    upper: 'var(--amber)', lower: 'var(--purple)', full: 'var(--accent)', custom: 'var(--text-muted)',
  }
  const color = SPLIT_COLORS[template.splitType] || 'var(--accent)'
  
  // Custom templates don't start with 'tmpl-' prefix
  const isCustom = !template.id.startsWith('tmpl-')

  return (
    <div className="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {template.splitType}
            </span>
            {isCustom && <span className="badge badge-amber" style={{ fontSize: 9 }}>Custom</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{template.name}</div>
          {template.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{template.description}</div>}
        </div>
        
        {/* Template management buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onDuplicate}
            className="btn btn-secondary btn-sm"
            style={{ padding: 4, height: 26, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Duplicate Routine"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={onEdit}
            className="btn btn-secondary btn-sm"
            style={{ padding: 4, height: 26, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Edit Routine"
          >
            <Edit3 size={12} />
          </button>
          {isCustom && (
            <button
              onClick={onDelete}
              className="btn btn-danger btn-sm"
              style={{ padding: 4, height: 26, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Delete Routine"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
        {template.exercises.map((te, idx) => (
          <span key={`${te.exerciseId}-${idx}`} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            {te.exercise?.name || 'Unknown Exercise'}
          </span>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onStart} style={{ width: '100%', marginTop: 'auto' }}>
        <Play size={14} /> Start Workout
      </button>
    </div>
  )
}

// ─── Exercise Card (Active Session) ─────────────────────────────────────────

function ExerciseCard({
  sessionExercise,
  onAddSet,
  onDeleteSet,
  personalRecord,
  defaultRest,
  prevSets,
  recommendation,
}: {
  sessionExercise: SessionExercise
  onAddSet: (data: Omit<ExerciseSet, 'id' | 'sessionExerciseId'>) => void
  onDeleteSet: (setId: string) => void
  personalRecord: number
  defaultRest: number
  prevSets: ExerciseSet[]
  recommendation?: ProgressionRecommendation
}) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [isWarmup, setIsWarmup] = useState(false)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showPR, setShowPR] = useState(false)

  useEffect(() => {
    return () => {
      if (restRef.current) clearInterval(restRef.current)
    }
  }, [])

  const startRest = () => {
    setRestTimer(defaultRest)
    if (restRef.current) clearInterval(restRef.current)
    restRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null || prev <= 1) { clearInterval(restRef.current!); return null }
        return prev - 1
      })
    }, 1000)
  }

  const addSet = () => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(w) || isNaN(r) || r <= 0) return
    const e1rm = calcEstimated1RM(w, r)
    const isPR = !isWarmup && e1rm > personalRecord
    onAddSet({ setNumber: sessionExercise.sets.length + 1, weightKg: w, reps: r, isWarmup, completedAt: new Date().toISOString(), isPR })
    if (isPR) { setShowPR(true); setTimeout(() => setShowPR(false), 3000) }
    startRest()
  }

  return (
    <div className="card-elevated" style={{ position: 'relative' }}>
      {showPR && (
        <div style={{
          position: 'absolute', top: -10, right: 12, zIndex: 10,
          background: 'var(--accent)', color: '#0a0b0f', padding: '4px 12px',
          borderRadius: 20, fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6,
          animation: 'fadeIn 0.3s ease',
        }}>
          <Trophy size={12} /> NEW PR!
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{sessionExercise.exercise?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {sessionExercise.exercise?.muscleGroups.join(', ')}
            {personalRecord > 0 && ` · PR: ${personalRecord}kg e1RM`}
          </div>
        </div>
        {restTimer !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
            <Timer size={16} />
            {formatDuration(restTimer)}
          </div>
        )}
      </div>

      {/* Previous performance */}
      {prevSets.length > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 10px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Last: {prevSets.slice(-3).map((s, i) => (
            <span key={i} style={{ marginRight: 8 }}>{s.weightKg}×{s.reps}</span>
          ))}
        </div>
      )}

      {/* Warnings Banners */}
      {recommendation?.fatigueWarning && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start'
        }} data-testid="fatigue-warning">
          <AlertTriangle size={16} color="var(--red)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>⚠ Recovery Warning</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Strength and training volume have declined over multiple sessions. Focus on recovery, sleep, and nutrition.
            </div>
          </div>
        </div>
      )}

      {recommendation?.stallDetected && (
        <div style={{
          background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start'
        }} data-testid="plateau-warning">
          <AlertTriangle size={16} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--amber)' }}>⚠ Plateau Detected</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Performance has stagnated. Recommended Deload: <strong>{recommendation.suggestedWeight ?? 0}kg</strong>
            </div>
          </div>
        </div>
      )}

      {/* Coaching Recommendation Card */}
      {recommendation && recommendation.recommendationType !== 'insufficient_data' && (
        <div className="card-glass" style={{
          padding: '14px', borderRadius: 10, marginBottom: 12, border: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8
        }} data-testid="recommendation-card">
          <div className="flex-between">
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
              Coaching Recommendation
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Readiness: <strong style={{
                  color: recommendation.readinessScore >= 90 ? 'var(--emerald)' :
                         recommendation.readinessScore >= 75 ? 'var(--accent)' :
                         recommendation.readinessScore >= 60 ? 'var(--amber)' : 'var(--red)'
                }}>{recommendation.readinessScore}/100</strong>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Confidence: <strong style={{
                  color: recommendation.confidence === 'high' ? 'var(--emerald)' :
                         recommendation.confidence === 'medium' ? 'var(--accent)' : 'var(--red)'
                }}>{recommendation.confidence.toUpperCase()}</strong>
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {recommendation.recommendationType.replace('_', ' ').toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {recommendation.suggestedWeight !== null && (
                <span>Suggested: <strong>{recommendation.suggestedWeight}kg × {recommendation.suggestedReps}</strong></span>
              )}
            </div>
          </div>

          {/* Fatigue / Stall warnings inside the recommendation card if present */}
          {recommendation.fatigueWarning && (
            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
              ⚠ Recovery Warning: Fatigue warning active.
            </div>
          )}
          {recommendation.stallDetected && (
            <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginTop: 4 }}>
              ⚠ Plateau Detected: Stall warning active. Recommended deload.
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '6px 10px', borderRadius: 6, lineHeight: 1.4, marginTop: 4 }}>
            {recommendation.reason}
          </div>
        </div>
      )}

      {/* Logged sets */}
      {sessionExercise.sets.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sessionExercise.sets.map((set, i) => (
            <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-base)', borderRadius: 8 }}>
              <span style={{ width: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{set.isWarmup ? 'W' : i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{set.weightKg}kg × {set.reps}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>e1RM: {calcEstimated1RM(set.weightKg, set.reps)}kg</span>
              {set.isPR && <Trophy size={12} color="var(--accent)" />}
              <button onClick={() => onDeleteSet(set.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add set form */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => setIsWarmup(!isWarmup)}
          style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${isWarmup ? 'var(--amber)' : 'var(--border-default)'}`,
            background: isWarmup ? 'var(--amber-bg)' : 'transparent', color: isWarmup ? 'var(--amber)' : 'var(--text-muted)',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Warmup
        </button>
        <input
          className="input"
          type="number"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{ width: 80 }}
        />
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>×</span>
        <input
          className="input"
          type="number"
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          style={{ width: 80 }}
          onKeyDown={(e) => e.key === 'Enter' && addSet()}
        />
        <button className="btn btn-primary btn-sm" onClick={addSet} disabled={!weight || !reps} style={{ flexShrink: 0 }}>
          + Set
        </button>
        <button
          onClick={startRest}
          className="btn btn-secondary btn-sm"
          style={{ flexShrink: 0 }}
          title="Start rest timer"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Session Timer ─────────────────────────────────────────────────────────────

function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  return (
    <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600, marginTop: 4 }}>
      ⏱ {formatDuration(elapsed)}
    </div>
  )
}

// ─── Workout Template Editor ───────────────────────────────────────────────

interface TemplateEditorProps {
  template: WorkoutTemplate | null
  exercisesLibrary: Exercise[]
  onSave: (templateData: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string, createdAt?: string }) => void
  onCancel: () => void
}

function TemplateEditor({ template, exercisesLibrary, onSave, onCancel }: TemplateEditorProps) {
  const addExercise = useWorkoutStore((s) => s.addExercise)
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [splitType, setSplitType] = useState<WorkoutTemplate['splitType']>(template?.splitType || 'custom')
  const [selectedExs, setSelectedExs] = useState<WorkoutTemplateExercise[]>(template?.exercises || [])
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)

  const handleAddExercise = (ex: Exercise) => {
    const newTe: WorkoutTemplateExercise = {
      id: generateId(),
      templateId: template?.id || '',
      exerciseId: ex.id,
      exercise: ex,
      orderIndex: selectedExs.length,
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
    }
    setSelectedExs((prev) => [...prev, newTe])
    setShowSearchModal(false)
  }

  const handleRemoveExercise = (idx: number) => {
    setSelectedExs((prev) =>
      prev.filter((_, i) => i !== idx).map((te, i) => ({ ...te, orderIndex: i }))
    )
  }

  const handleMoveExercise = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === selectedExs.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    setSelectedExs((prev) => {
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = { ...copy[swapIdx], orderIndex: idx }
      copy[swapIdx] = { ...temp, orderIndex: swapIdx }
      return copy
    })
  }

  const handleUpdateExerciseField = (idx: number, field: keyof WorkoutTemplateExercise, val: string | number) => {
    setSelectedExs((prev) =>
      prev.map((te, i) => (i === idx ? { ...te, [field]: val } : te))
    )
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    onSave({
      id: template?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      splitType,
      exercises: selectedExs,
      createdAt: template?.createdAt || new Date().toISOString(),
    })
  }

  // Filter exercises library
  const searchedExercises = searchExercises(exercisesLibrary, searchQuery)
  const filteredExercises = selectedMuscle
    ? searchedExercises.filter((ex) => ex.muscleGroups.includes(selectedMuscle))
    : searchedExercises

  const muscleList = Array.from(new Set(exercisesLibrary.flatMap((e) => e.muscleGroups))).sort()

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
          {template ? `Edit Routine: ${template.name}` : 'New Custom Workout'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Configure your template split and movements</p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card-elevated" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Workout Name</label>
            <input
              className="input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Upper Chest Focus, Legs Day"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Split Type</label>
              <select
                className="input"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as WorkoutTemplate['splitType'])}
              >
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
                <option value="upper">Upper Body</option>
                <option value="lower">Lower Body</option>
                <option value="full">Full Body</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 2 }}>
              <label className="input-label">Description (optional)</label>
              <input
                className="input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Focus on hypertrophy or strength goals"
              />
            </div>
          </div>
        </div>

        {/* Exercises List */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Exercises</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {selectedExs.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <div className="empty-state-title" style={{ fontSize: 14 }}>No exercises added</div>
                <div className="empty-state-desc" style={{ fontSize: 12 }}>Click below to add movements to your custom routine</div>
              </div>
            ) : (
              selectedExs.map((te, idx) => (
                <div key={te.id} className="card" style={{ padding: '14px 18px' }}>
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{te.exercise?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {te.exercise?.muscleGroups.join(', ')} · {te.exercise?.equipment || 'No Equipment'}
                      </div>
                    </div>
                    
                    {/* Control buttons */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(idx, 'up')}
                        disabled={idx === 0}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(idx, 'down')}
                        disabled={idx === selectedExs.length - 1}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: 4, opacity: idx === selectedExs.length - 1 ? 0.3 : 1 }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(idx)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Settings fields */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sets:</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={10}
                        value={te.targetSets}
                        onChange={(e) => handleUpdateExerciseField(idx, 'targetSets', parseInt(e.target.value, 10) || 1)}
                        style={{ width: 50, padding: '4px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reps:</span>
                      <input
                        className="input"
                        type="text"
                        value={te.targetReps}
                        onChange={(e) => handleUpdateExerciseField(idx, 'targetReps', e.target.value)}
                        placeholder="e.g. 8-12, 5"
                        style={{ width: 70, padding: '4px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rest:</span>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={te.restSeconds}
                        onChange={(e) => handleUpdateExerciseField(idx, 'restSeconds', parseInt(e.target.value, 10) || 0)}
                        style={{ width: 60, padding: '4px 8px', fontSize: 12 }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>sec</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 150 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Note:</span>
                      <input
                        className="input"
                        type="text"
                        value={te.notes || ''}
                        onChange={(e) => handleUpdateExerciseField(idx, 'notes', e.target.value)}
                        placeholder="e.g. Focus on control"
                        style={{ padding: '4px 8px', fontSize: 12, flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSearchModal(true)}
            style={{ width: '100%' }}
          >
            <Plus size={14} /> Add Exercise
          </button>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name || selectedExs.length === 0} style={{ flex: 2 }}>
            Save Workout
          </button>
        </div>
      </form>

      {/* Add Exercise Selector Overlay Modal */}
      {showSearchModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 500, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 24 }}>
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Select Exercise</h3>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <input
                className="input"
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedMuscle(null)}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: selectedMuscle === null ? 'var(--accent)' : 'var(--bg-muted)',
                    color: selectedMuscle === null ? '#0a0b0f' : 'var(--text-muted)',
                  }}
                >
                  All
                </button>
                {muscleList.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => setSelectedMuscle(muscle)}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: selectedMuscle === muscle ? 'var(--accent)' : 'var(--bg-muted)',
                      color: selectedMuscle === muscle ? '#0a0b0f' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredExercises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    No exercises match "{searchQuery}"
                  </div>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const newEx = addExercise({
                          name: searchQuery.trim(),
                          category: 'strength',
                          muscleGroups: ['Other'],
                          isCustom: true
                        })
                        handleAddExercise(newEx)
                        setSearchQuery('')
                      }}
                    >
                      <Plus size={12} /> Create Custom Exercise: {searchQuery}
                    </button>
                  )}
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleAddExercise(ex)}
                    className="card nav-item"
                    style={{
                      padding: '10px 14px', width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-default)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {ex.muscleGroups.join(', ')}
                      </div>
                    </div>
                    <Plus size={14} style={{ color: 'var(--accent)' }} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
