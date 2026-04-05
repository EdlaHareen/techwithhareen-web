import { useState, useEffect, useRef } from "react"
import { clarifyTopic, startResearch, getJob, listPosts, getPreferences, updatePreferences } from "../lib/api"
import type { ClarifierQuestion, Job, Post } from "../lib/api"
import PostCard from "../components/PostCard"
import ClarifierStep from "../components/ClarifierStep"

type Phase = "idle" | "clarifying" | "researching" | "creating" | "analyzing" | "ready" | "failed"

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  clarifying: "Customizing your carousel…",
  researching: "Researching topic…",
  creating: "Creating carousels…",
  analyzing: "Analyzing post quality…",
  ready: "Posts ready!",
  failed: "Pipeline failed",
}

const PHASE_ORDER: Phase[] = ["researching", "creating", "analyzing", "ready"]

const TEMPLATE_OPTIONS = [
  { id: "dark_tech", label: "Dark Tech", color: "bg-gray-900" },
  { id: "clean_light", label: "Clean Light", color: "bg-gray-100" },
] as const

const FORMAT_OPTIONS = [
  { id: "news", label: "News" },
  { id: "A", label: "Mistakes" },
  { id: "B", label: "Pillars" },
  { id: "C", label: "Cheat Sheet" },
  { id: "listicle", label: "Listicle" },
] as const

export default function NewPost() {
  const [topic, setTopic] = useState("")
  const [contentType, setContentType] = useState<"news" | "educational">("news")
  const [templateId, setTemplateId] = useState("dark_tech")
  const [formatId, setFormatId] = useState("news")
  const [phase, setPhase] = useState<Phase>("idle")
  const [jobId, setJobId] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState<string | null>(null)
  const [clarifierQuestions, setClarifierQuestions] = useState<ClarifierQuestion[]>([])
  const [usingDefaultFormat, setUsingDefaultFormat] = useState(false)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch saved preferences on mount
  useEffect(() => {
    getPreferences()
      .then(({ preferences }) => {
        if (preferences.default_template) setTemplateId(preferences.default_template)
        if (preferences.default_format) setFormatId(preferences.default_format)
        setPrefsLoaded(true)
      })
      .catch(() => setPrefsLoaded(true)) // silently use defaults
  }, [])

  // Sync contentType from formatId
  useEffect(() => {
    if (formatId === "news" || formatId === "listicle") {
      setContentType("news")
    } else {
      setContentType("educational")
    }
  }, [formatId])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  async function fetchResults(job: Job) {
    if (job.story_ids.length === 0) return
    const fetched = await listPosts()
    const relevant = fetched.filter((p) => job.story_ids.includes(p.id))
    setPosts(relevant)
  }

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(id)
        setPhase(job.status as Phase)
        if (job.status === "ready") {
          stopPolling()
          await fetchResults(job)
        } else if (job.status === "failed") {
          stopPolling()
          setError("The research pipeline failed. Try a different topic or check API keys.")
        }
      } catch (e) {
        stopPolling()
        setError((e as Error).message)
        setPhase("failed")
      }
    }, 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed) return

    setError(null)
    setPosts([])
    setUsingDefaultFormat(false)

    // Educational formats (A/B/C) use the clarifier flow
    if (contentType === "educational" && formatId !== "listicle") {
      setPhase("clarifying")
      try {
        const questions = await clarifyTopic(trimmed)
        if (questions && questions.length > 0) {
          setClarifierQuestions(questions)
        } else {
          setUsingDefaultFormat(true)
          await handleLaunchResearch({})
        }
      } catch {
        setUsingDefaultFormat(true)
        await handleLaunchResearch({})
      }
    } else {
      await handleLaunchResearch({})
    }
  }

  async function handleLaunchResearch(answers: Record<string, string>) {
    const trimmed = topic.trim()
    if (!trimmed) return

    // Determine carousel format
    let carouselFormat: string | undefined
    if (formatId === "listicle") {
      carouselFormat = "listicle"
    } else if (contentType === "educational") {
      carouselFormat = answers["format"] ?? formatId
    }

    setPhase("researching")

    try {
      const { job_id } = await startResearch(
        trimmed,
        contentType,
        carouselFormat,
        Object.keys(answers).length > 0 ? answers : undefined,
        templateId,
      )
      setJobId(job_id)
      startPolling(job_id)
    } catch (e) {
      setError((e as Error).message)
      setPhase("failed")
    }
  }

  function handleReset() {
    stopPolling()
    setPhase("idle")
    setJobId(null)
    setPosts([])
    setError(null)
    setTopic("")
    setClarifierQuestions([])
    setUsingDefaultFormat(false)
  }

  async function handleSaveDefaults() {
    try {
      await updatePreferences(templateId, formatId)
    } catch {
      // silent — preferences are optional
    }
  }

  const isRunning = phase !== "idle" && phase !== "clarifying" && phase !== "ready" && phase !== "failed"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">New Post</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter a topic — the system will research, create, and prepare posts for approval.
        </p>
      </div>

      {/* Topic input */}
      <form onSubmit={handleSubmit} className="mb-8">
        {/* Template selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Template</label>
          <div className="flex gap-2">
            {TEMPLATE_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                disabled={isRunning}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  templateId === t.id
                    ? "ring-2 ring-violet-500 bg-white shadow-sm"
                    : "border border-gray-200 text-gray-600 hover:border-violet-300"
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${t.color} border border-gray-300`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Format</label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                disabled={isRunning}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors disabled:opacity-50 ${
                  formatId === f.id
                    ? "bg-violet-600 text-white"
                    : "border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save as defaults button */}
        {prefsLoaded && (
          <button
            type="button"
            onClick={handleSaveDefaults}
            disabled={isRunning}
            className="text-xs text-gray-400 hover:text-violet-600 mb-3 transition-colors disabled:opacity-50"
          >
            Save as defaults
          </button>
        )}

        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              formatId === "listicle"
                ? "e.g. best AI coding tools, top open-source repos for DevOps…"
                : contentType === "educational"
                ? "e.g. how to use Claude for work, prompt engineering basics…"
                : "e.g. AI chip shortage, OpenAI latest news…"
            }
            disabled={isRunning}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={isRunning || !topic.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Create Posts
          </button>
        </div>
      </form>

      {/* Clarifier step — shown while waiting for questions or when questions are ready */}
      {phase === "clarifying" && clarifierQuestions.length > 0 && (
        <ClarifierStep
          questions={clarifierQuestions}
          onSubmit={handleLaunchResearch}
          onSkip={() => handleLaunchResearch({})}
        />
      )}

      {/* Loading state — shown while waiting for clarifier API response */}
      {phase === "clarifying" && clarifierQuestions.length === 0 && (
        <div className="mb-6 flex items-center justify-center py-6 text-sm text-gray-400">
          <span className="animate-pulse">
            {usingDefaultFormat ? "Using default format (Pillars)…" : "Loading questions…"}
          </span>
        </div>
      )}

      {/* Pipeline status */}
      {phase !== "idle" && phase !== "clarifying" && (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              {PHASE_LABELS[phase]}
            </span>
            {(phase === "ready" || phase === "failed") && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Start over
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {PHASE_ORDER.map((step, i) => {
              const stepIndex = PHASE_ORDER.indexOf(phase)
              const isDone = stepIndex > i || phase === "ready"
              const isActive = step === phase && phase !== "ready"
              const isFailed = phase === "failed" && stepIndex === i

              return (
                <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium transition-colors ${
                      isFailed
                        ? "bg-red-500 text-white"
                        : isDone
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      isDone || isActive ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                  {i < PHASE_ORDER.length - 1 && (
                    <div className="flex-1 h-px bg-gray-200 mx-1" />
                  )}
                </div>
              )
            })}
          </div>

          {jobId && (
            <p className="text-xs text-gray-400 mt-3">Job ID: {jobId}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Results */}
      {posts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            {posts.length} post{posts.length !== 1 ? "s" : ""} ready for review
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={() => {
                  setPosts((prev) =>
                    prev.map((p) =>
                      p.id === post.id ? { ...p, status: "approved" } : p,
                    ),
                  )
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
