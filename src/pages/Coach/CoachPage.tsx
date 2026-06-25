import { useState, useRef, useEffect } from 'react'
import { Send, Brain, Loader, Sparkles, X, Check } from 'lucide-react'
import { useGoalsStore, useWeightStore, useFoodStore, useWorkoutStore, useMemoryStore, useProfileStore, useSettingsStore, useChatStore } from '@/store/index'
import { createAIProvider, extractMemorySuggestions } from '@/lib/ai'
import type { FitnessContext } from '@/lib/ai'
import { todayISO, daysAgo } from '@/lib/utils'
import { generateTrainingIntelligence } from '@/lib/progressiveOverload'
import { getRecompositionReport, generateRecompositionCoachContext } from '@/lib/recompositionIntelligence'
import { getNutritionRecommendation, getNutritionAnalytics, generateNutritionCoachContext } from '@/lib/nutritionIntelligence'

const SUGGESTED_PROMPTS = [
  'How am I doing overall?',
  'Analyze my nutrition this week',
  'Is my cut progressing well?',
  'What should I focus on today?',
  "Why isn't the scale moving?",
  'Am I hitting my protein targets?',
  'How can I improve my training?',
  'Give me a weekly summary',
]

export function CoachPage() {
  const settings = useSettingsStore((s) => s.settings)
  const profile = useProfileStore((s) => s.profile)
  const getActiveGoal = useGoalsStore((s) => s.getActiveGoal)
  const getRange = useWeightStore((s) => s.getRange)
  const getLogsByDate = useFoodStore((s) => s.getLogsByDate)
  const sessions = useWorkoutStore((s) => s.sessions)
  const exercises = useWorkoutStore((s) => s.exercises)
  const memories = useMemoryStore((s) => s.memories)
  const addSuggestion = useMemoryStore((s) => s.addSuggestion)
  const messages = useChatStore((s) => s.messages)
  const addMessage = useChatStore((s) => s.addMessage)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingMemories, setPendingMemories] = useState<Array<{ id: string; title: string; content: string; category: string }>>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildContext = (): FitnessContext => {
    const today = todayISO()
    const todayLogs = getLogsByDate(today)
    const todayNutrition = todayLogs.reduce(
      (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein, carbs: acc.carbs + l.carbs, fat: acc.fat + l.fat, fiber: acc.fiber }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    )
    const activeGoal = getActiveGoal()

    const trainingIntelligence = generateTrainingIntelligence(sessions, exercises, activeGoal)

    const { measurements, logs: weightLogs } = useWeightStore.getState()
    const recompReport = getRecompositionReport(measurements, weightLogs, sessions)
    const latestMeasurement = measurements[measurements.length - 1] || null
    const recompositionIntelligence = generateRecompositionCoachContext(recompReport, latestMeasurement)

    const { foodLogs } = useFoodStore.getState()
    const nutritionRecommendation = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, profile)
    const nutritionAnalytics = getNutritionAnalytics(foodLogs, activeGoal?.calorieTarget || 2000, activeGoal?.proteinTarget || 150)
    const nutritionIntelligence = generateNutritionCoachContext(nutritionRecommendation, nutritionAnalytics, activeGoal)

    return {
      profile,
      activeGoal,
      recentWeight: getRange(daysAgo(30), today),
      todayNutrition,
      targetNutrition: { calories: activeGoal?.calorieTarget || 2000, protein: activeGoal?.proteinTarget || 150 },
      recentWorkouts: sessions.slice(0, 10),
      memories: memories.filter((m) => m.isApproved),
      todayDate: today,
      trainingIntelligence,
      recompositionIntelligence,
      nutritionIntelligence,
    }
  }

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText || loading) return
    if (!settings.aiApiKey) {
      setError('No AI API key configured. Go to Settings → AI to add your Groq key.')
      return
    }

    setInput('')
    setError('')
    addMessage({ role: 'user', content: msgText })
    setLoading(true)

    try {
      const provider = createAIProvider(settings.aiProvider, settings.aiApiKey, settings.aiModel)
      const context = buildContext()
      const chatHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      chatHistory.push({ role: 'user', content: msgText })

      const rawResponse = await provider.chat(chatHistory, context)
      const { cleanText, suggestions } = extractMemorySuggestions(rawResponse)
      
      addMessage({ role: 'assistant', content: cleanText })
      
      if (suggestions.length > 0) {
        const newPending = suggestions.map((s, i) => ({
          id: `sugg_${Date.now()}_${i}`,
          title: s.title,
          content: s.content,
          category: s.category,
        }))
        setPendingMemories((prev) => [...prev, ...newPending])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  const approveMemory = (id: string) => {
    const mem = pendingMemories.find((m) => m.id === id)
    if (mem) {
      addSuggestion({
        category: mem.category as 'preference' | 'insight' | 'goal_context' | 'behavioral',
        title: mem.title,
        content: mem.content,
        source: 'ai',
        confidenceScore: 0.8,
        tags: [],
        isApproved: false,
      })
      const { approveMemory: storeApprove } = useMemoryStore.getState()
      // Get the most recent pending
      const pending = useMemoryStore.getState().pendingSuggestions
      if (pending[0]) storeApprove(pending[0].id)
    }
    setPendingMemories((prev) => prev.filter((m) => m.id !== id))
  }

  const rejectMemory = (id: string) => {
    setPendingMemories((prev) => prev.filter((m) => m.id !== id))
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0 6px' }}>{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0 6px' }}>{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 12, marginBottom: 4, display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span><span>{line.slice(2)}</span></div>
        if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ color: 'var(--text-primary)', display: 'block' }}>{line.slice(2, -2)}</strong>
        if (line === '') return <div key={i} style={{ height: 8 }} />
        return <p key={i} style={{ marginBottom: 4 }}>{line}</p>
      })
  }

  const hasApiKey = !!settings.aiApiKey

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--nav-height, 0px))', maxWidth: 780, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div className="flex-start" style={{ gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-accent)' }}>
            <Brain size={20} color="#0a0b0f" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>AI Coach</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {hasApiKey ? `Powered by Groq · ${settings.aiModel}` : 'No API key configured'}
            </div>
          </div>
          {!hasApiKey && (
            <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>⚠ Setup Required</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 64, height: 64, background: 'var(--accent-bg)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Sparkles size={28} color="var(--accent)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your AI Fitness Coach</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
              Ask me anything about your fitness journey. I have full access to your goals, nutrition logs, workout history, and weight data.
            </p>
            {!hasApiKey && (
              <div style={{ marginTop: 20, padding: '14px 20px', background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, color: 'var(--amber)', fontSize: 13 }}>
                Add your Groq API key in Settings → AI to enable the coach.
              </div>
            )}
            {hasApiKey && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                {SUGGESTED_PROMPTS.slice(0, 6).map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    style={{
                      padding: '8px 14px', borderRadius: 20,
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.2s ease' }}>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
              color: msg.role === 'user' ? '#0a0b0f' : 'var(--text-primary)',
              fontSize: 14, lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
            }}>
              {msg.role === 'assistant' ? formatMessage(msg.content) : <p style={{ margin: 0 }}>{msg.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--border-subtle)', display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Memory suggestions */}
        {pendingMemories.map((mem) => (
          <div key={mem.id} style={{ background: 'var(--accent-bg)', border: '1px solid rgba(163,230,53,0.2)', borderRadius: 12, padding: '12px 16px' }}>
            <div className="flex-between" style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} color="var(--accent)" />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>MEMORY SUGGESTION</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => approveMemory(mem.id)}
                  style={{ padding: '4px 10px', border: 'none', background: 'var(--accent)', color: '#0a0b0f', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Check size={12} /> Save
                </button>
                <button
                  onClick={() => rejectMemory(mem.id)}
                  style={{ padding: '4px 8px', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{mem.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{mem.content}</div>
          </div>
        ))}

        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length > 0 && hasApiKey && (
        <div style={{ padding: '8px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
            {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                style={{
                  padding: '6px 12px', borderRadius: 16, whiteSpace: 'nowrap',
                  border: '1px solid var(--border-default)', background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 24px 20px', flexShrink: 0, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={hasApiKey ? 'Ask your coach anything...' : 'Add your Groq API key in Settings to chat'}
            disabled={!hasApiKey || loading}
            rows={1}
            style={{
              flex: 1, resize: 'none', overflowY: 'hidden',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              borderRadius: 16, padding: '12px 16px', color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
              transition: 'border-color 0.15s ease',
              minHeight: 48,
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || !hasApiKey}
            style={{ width: 48, height: 48, padding: 0, borderRadius: 14, flexShrink: 0 }}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
