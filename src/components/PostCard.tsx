import { useState } from "react"
import type { Post } from "../lib/api"
import { approvePost, rejectPost, updateCaption } from "../lib/api"
import SlideEditorModal from "./SlideEditorModal"

interface Props {
  post: Post
  onUpdate: () => void
}

export default function PostCard({ post, onUpdate }: Props) {
  const [caption, setCaption] = useState(post.caption)
  const [editingCaption, setEditingCaption] = useState(false)
  const [sendToTelegram, setSendToTelegram] = useState(false)
  const [loading, setLoading] = useState<"approve" | "reject" | "caption" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [slides, setSlides] = useState(post.slides)
  const [showSlideEditor, setShowSlideEditor] = useState(false)

  const isPending = post.status === "pending"

  async function handleApprove() {
    setLoading("approve")
    setError(null)
    try {
      await approvePost(post.id, sendToTelegram)
      onUpdate()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    setError(null)
    try {
      await rejectPost(post.id)
      onUpdate()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function handleSaveCaption() {
    setLoading("caption")
    setError(null)
    try {
      await updateCaption(post.id, caption)
      setEditingCaption(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  const statusColors: Record<Post["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {post.story.headline}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">{post.story.source}</span>
            {post.story.topic && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{post.story.topic}</span>
              </>
            )}
            {post.dm_keyword && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                DM: {post.dm_keyword}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[post.status]}`}
        >
          {post.status}
        </span>
      </div>

      {/* Slides */}
      {slides.length > 0 && (
        <div className="bg-gray-50 p-4">
          <div className="relative aspect-square max-h-64 mx-auto rounded-lg overflow-hidden bg-gray-200">
            <img
              src={slides[activeSlide]}
              alt={`Slide ${activeSlide + 1}`}
              className="w-full h-full object-cover"
            />
            {slides.length > 1 && (
              <>
                <button
                  onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
                  disabled={activeSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/60 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setActiveSlide((s) => Math.min(slides.length - 1, s + 1))
                  }
                  disabled={activeSlide === slides.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/60 transition-colors"
                >
                  ›
                </button>
              </>
            )}
          </div>
          {/* Dot indicators + Edit button */}
          <div className="flex items-center justify-between mt-2">
            {slides.length > 1 ? (
              <div className="flex justify-center gap-1 flex-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === activeSlide ? "bg-gray-700" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex items-center gap-3 shrink-0">
              {post.pdf_url && (
                <a
                  href={post.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  View Guide PDF
                </a>
              )}
              {isPending && (
                <button
                  onClick={() => setShowSlideEditor(true)}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  Edit Slides
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSlideEditor && (
        <SlideEditorModal
          post={{ ...post, slides }}
          onClose={() => setShowSlideEditor(false)}
          onSaved={(updatedSlides) => {
            setSlides(updatedSlides)
            setActiveSlide(0)
          }}
        />
      )}

      {/* Caption */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Caption
          </span>
          {isPending && !editingCaption && (
            <button
              onClick={() => setEditingCaption(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          )}
        </div>
        {editingCaption ? (
          <div className="space-y-2">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full text-xs text-gray-700 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveCaption}
                disabled={loading === "caption"}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading === "caption" ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setCaption(post.caption)
                  setEditingCaption(false)
                }}
                className="text-xs px-3 py-1.5 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-6">
            {caption}
          </p>
        )}
      </div>

      {/* Validation warning */}
      {post.story.validation_notes && (
        <div className="px-5 pb-3">
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠ {post.story.validation_notes}
          </p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="px-5 pb-4 pt-2 border-t border-gray-100 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendToTelegram}
              onChange={(e) => setSendToTelegram(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-600"
            />
            <span className="text-xs text-gray-600">Also send to Telegram</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading !== null}
              className="flex-1 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading === "approve" ? "Publishing…" : "Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={loading !== null}
              className="flex-1 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Rejection reason */}
      {post.status === "rejected" && post.rejection_reason && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500">
            Reason: {post.rejection_reason}
          </p>
        </div>
      )}
    </div>
  )
}
