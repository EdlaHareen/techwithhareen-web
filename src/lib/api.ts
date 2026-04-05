/**
 * Typed API client for the techwithhareen backend.
 * All requests go to VITE_API_URL (set per environment).
 */

const BASE = import.meta.env.VITE_API_URL ?? ""

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = "researching" | "creating" | "analyzing" | "ready" | "failed"
export type PostStatus = "pending" | "approved" | "rejected"
export type PostSource = "newsletter" | "exa" | "tavily" | "serper" | "web_ui"

export interface Job {
  id: string
  topic: string
  status: JobStatus
  created_at: string
  story_ids: string[]
}

export interface Story {
  headline: string
  summary: string
  url: string | null
  source: PostSource
  topic: string | null
  validation_passed: boolean | null
  validation_notes: string
}

export interface RenderData {
  headline: string
  key_stats: string[]
  hook_stat_value: string
  hook_stat_label: string
  source_url: string | null
  image_url: string | null
  template_id?: string
}

export interface Post {
  id: string
  story: Story
  slides: string[]
  caption: string
  status: PostStatus
  source: PostSource
  telegram_sent: boolean
  render_data: RenderData | null
  created_at: string
  approved_at: string | null
  rejection_reason: string | null
  // Educational-only fields (undefined for news posts)
  pdf_url?: string
  dm_keyword?: string
  content_type?: string
  carousel_format?: string  // "A" | "B" | "C" | "listicle"
  template_id?: string      // "dark_tech" | "clean_light"
}

// ---------------------------------------------------------------------------
// Clarifier types
// ---------------------------------------------------------------------------

export interface ClarifierOption {
  value: string
  label: string
}

export interface ClarifierQuestion {
  id: string
  text: string
  options: ClarifierOption[]
  default: string
}

// ---------------------------------------------------------------------------
// Clarifier
// ---------------------------------------------------------------------------

export async function clarifyTopic(topic: string): Promise<ClarifierQuestion[]> {
  const res = await fetch(`${BASE}/api/v2/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
    signal: AbortSignal.timeout(20000),  // 20s timeout — thinking model needs ~10s
  })
  if (!res.ok) throw new Error(`clarify → ${res.status}`)
  const data = await res.json()
  return data.questions as ClarifierQuestion[]
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export function startResearch(
  topic: string,
  contentType: "news" | "educational" = "news",
  carouselFormat?: string,
  clarifierAnswers?: Record<string, string>,
  templateId: string = "dark_tech",
): Promise<{ job_id: string }> {
  return request("POST", "/api/v2/research", {
    topic,
    content_type: contentType,
    template_id: templateId,
    ...(carouselFormat !== undefined && { carousel_format: carouselFormat }),
    ...(clarifierAnswers !== undefined && { clarifier_answers: clarifierAnswers }),
  })
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface Preferences {
  default_template: string
  default_format: string
}

export function getPreferences(): Promise<{
  preferences: Preferences
  available_templates: string[]
  available_formats: string[]
}> {
  return request("GET", "/api/v2/preferences")
}

export function updatePreferences(
  defaultTemplate?: string,
  defaultFormat?: string,
): Promise<{ status: string }> {
  return request("PATCH", "/api/v2/preferences", {
    ...(defaultTemplate !== undefined && { default_template: defaultTemplate }),
    ...(defaultFormat !== undefined && { default_format: defaultFormat }),
  })
}

export function getJob(jobId: string): Promise<Job> {
  return request("GET", `/api/v2/jobs/${jobId}`)
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export function listPosts(status?: PostStatus): Promise<Post[]> {
  const qs = status ? `?status=${status}` : ""
  return request("GET", `/api/v2/posts${qs}`)
}

export function getPost(postId: string): Promise<Post> {
  return request("GET", `/api/v2/posts/${postId}`)
}

export function approvePost(
  postId: string,
  sendToTelegram = false,
): Promise<{ published: boolean; telegram_sent: boolean }> {
  return request("POST", `/api/v2/posts/${postId}/approve`, {
    send_to_telegram: sendToTelegram,
  })
}

export function rejectPost(
  postId: string,
  reason = "",
): Promise<{ rejected: boolean }> {
  return request("POST", `/api/v2/posts/${postId}/reject`, { reason })
}

export function updateCaption(
  postId: string,
  caption: string,
): Promise<{ updated: boolean }> {
  return request("PATCH", `/api/v2/posts/${postId}/caption`, { caption })
}

export function updateSlides(
  postId: string,
  renderData: RenderData,
): Promise<{ slides: string[]; slide_count: number }> {
  return request("PATCH", `/api/v2/posts/${postId}/slides`, renderData)
}

export function deleteSlide(
  postId: string,
  slideIndex: number,
): Promise<{ slides: string[] }> {
  return request("DELETE", `/api/v2/posts/${postId}/slides/${slideIndex}`)
}

export function reorderSlides(
  postId: string,
  order: number[],
): Promise<{ slides: string[] }> {
  return request("POST", `/api/v2/posts/${postId}/slides/reorder`, { order })
}
