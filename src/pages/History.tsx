import { useEffect, useState } from "react"
import { listPosts } from "../lib/api"
import type { Post, PostStatus } from "../lib/api"

const STATUS_TABS: { label: string; value: PostStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function History() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<PostStatus | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    listPosts(filter)
      .then((data) => {
        // Exclude pending — Dashboard owns those
        const nonPending = data.filter((p) => p.status !== "pending")
        setPosts(nonPending)
        setError(null)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [filter])

  const statusColors: Record<Post["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">History</h1>
        <p className="text-sm text-gray-500 mt-1">All processed posts</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              filter === tab.value
                ? "bg-white text-gray-900 shadow-sm font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">No posts yet.</p>
        </div>
      )}

      {/* Table */}
      {posts.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Headline
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Source / Topic
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 max-w-xs">
                    <p className="truncate font-medium">{post.story.headline}</p>
                    {post.rejection_reason && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {post.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <span>{post.story.source}</span>
                    {post.story.topic && (
                      <span className="block text-xs text-gray-400">{post.story.topic}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(post.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
