import { useEffect, useState, useCallback } from "react"
import { listPosts } from "../lib/api"
import type { Post } from "../lib/api"
import PostCard from "../components/PostCard"

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const data = await listPosts("pending")
      setPosts(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Posts waiting for approval</p>
      </div>

      {loading && (
        <div className="text-sm text-gray-400">Loading…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">✓</div>
          <p className="text-sm">No posts pending — you're all caught up.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
        ))}
      </div>
    </div>
  )
}
