import { useState } from "react"
import type { Post, RenderData } from "../lib/api"
import { updateSlides, deleteSlide, reorderSlides } from "../lib/api"

interface Props {
  post: Post
  onClose: () => void
  onSaved: (updatedSlides: string[]) => void
}

type Tab = "content" | "slides"

export default function SlideEditorModal({ post, onClose, onSaved }: Props) {
  const defaultRenderData: RenderData = post.render_data ?? {
    headline: post.story.headline,
    key_stats: [],
    hook_stat_value: "",
    hook_stat_label: "",
    source_url: post.story.url,
    image_url: null,
  }

  const [tab, setTab] = useState<Tab>("content")
  const [renderData, setRenderData] = useState<RenderData>(defaultRenderData)
  const [slides, setSlides] = useState<string[]>(post.slides)
  const [loading, setLoading] = useState<"rerender" | "slides" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)

  // ── Content tab helpers ──────────────────────────────────────────────────

  function updateStat(index: number, value: string) {
    const next = [...renderData.key_stats]
    next[index] = value
    setRenderData({ ...renderData, key_stats: next })
  }

  function addStat() {
    setRenderData({ ...renderData, key_stats: [...renderData.key_stats, ""] })
  }

  function removeStat(index: number) {
    setRenderData({
      ...renderData,
      key_stats: renderData.key_stats.filter((_, i) => i !== index),
    })
  }

  async function handleRerender() {
    setLoading("rerender")
    setError(null)
    try {
      const result = await updateSlides(post.id, renderData)
      setSlides(result.slides)
      setPreviewIndex(0)
      onSaved(result.slides)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  // ── Slides tab helpers ───────────────────────────────────────────────────

  async function handleDeleteSlide(index: number) {
    if (slides.length <= 1) return
    setLoading("slides")
    setError(null)
    try {
      const result = await deleteSlide(post.id, index)
      setSlides(result.slides)
      setPreviewIndex(Math.min(previewIndex, result.slides.length - 1))
      onSaved(result.slides)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function handleMoveSlide(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= slides.length) return
    const newOrder = slides.map((_, i) => i)
    newOrder[index] = targetIndex
    newOrder[targetIndex] = index
    setLoading("slides")
    setError(null)
    try {
      const result = await reorderSlides(post.id, newOrder)
      setSlides(result.slides)
      setPreviewIndex(targetIndex)
      onSaved(result.slides)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Edit Slides</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["content", "slides"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t === "content" ? "Content" : "Manage Slides"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {tab === "content" && (
            <>
              {/* Headline */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Headline</label>
                <textarea
                  value={renderData.headline}
                  onChange={(e) => setRenderData({ ...renderData, headline: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={renderData.image_url ?? ""}
                  onChange={(e) =>
                    setRenderData({ ...renderData, image_url: e.target.value || null })
                  }
                  placeholder="https://…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Hook stat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Hook Stat Value
                  </label>
                  <input
                    type="text"
                    value={renderData.hook_stat_value}
                    onChange={(e) =>
                      setRenderData({ ...renderData, hook_stat_value: e.target.value })
                    }
                    placeholder="e.g. 70%"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Hook Stat Label
                  </label>
                  <input
                    type="text"
                    value={renderData.hook_stat_label}
                    onChange={(e) =>
                      setRenderData({ ...renderData, hook_stat_label: e.target.value })
                    }
                    placeholder="e.g. OF REVENUE FROM AI"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Stats */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Stats / Bullets
                </label>
                <div className="space-y-2">
                  {renderData.key_stats.map((stat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2 text-xs font-mono text-violet-500 w-6 shrink-0 text-right">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <textarea
                        value={stat}
                        onChange={(e) => updateStat(i, e.target.value)}
                        rows={2}
                        placeholder="HEADLINE&#10;explanation sentence"
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        onClick={() => removeStat(i)}
                        className="mt-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove stat"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addStat}
                  className="mt-2 text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  + Add stat
                </button>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Source URL (adds Read More slide)
                </label>
                <input
                  type="text"
                  value={renderData.source_url ?? ""}
                  onChange={(e) =>
                    setRenderData({ ...renderData, source_url: e.target.value || null })
                  }
                  placeholder="https://…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </>
          )}

          {tab === "slides" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Reorder or delete individual slides. Changes apply immediately.
              </p>
              {slides.map((url, i) => (
                <div
                  key={url}
                  className={`flex items-center gap-3 p-2 rounded-xl border transition-colors cursor-pointer ${
                    i === previewIndex ? "border-violet-400 bg-violet-50" : "border-gray-200"
                  }`}
                  onClick={() => setPreviewIndex(i)}
                >
                  <img
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className="w-12 h-14 object-cover rounded-lg shrink-0 bg-gray-100"
                  />
                  <span className="text-xs text-gray-500 flex-1 font-medium">
                    Slide {i + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveSlide(i, -1) }}
                      disabled={i === 0 || loading !== null}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveSlide(i, 1) }}
                      disabled={i === slides.length - 1 || loading !== null}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSlide(i) }}
                      disabled={slides.length <= 1 || loading !== null}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-20"
                      title="Delete slide"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              {/* Preview */}
              {slides[previewIndex] && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Preview — Slide {previewIndex + 1}</p>
                  <img
                    src={slides[previewIndex]}
                    alt={`Preview slide ${previewIndex + 1}`}
                    className="w-full max-w-xs mx-auto rounded-xl shadow"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
          {tab === "content" && (
            <button
              onClick={handleRerender}
              disabled={loading !== null}
              className="text-sm px-5 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading === "rerender" ? "Re-rendering…" : "Re-render All Slides"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
