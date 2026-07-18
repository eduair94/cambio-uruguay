// Client-facing shape of GET /api/reddit-topics (proxied to the app's published topic snapshots).
// Mirrors PublishedTopics in app/server/utils/redditTopicsStore.ts, kept here as a pure type so the
// page can import it without pulling server code into the client bundle.
export interface PublishedTopicThread {
  title: string
  permalink: string
  score: number
  numComments: number
  date: string
  sub: string
}

export interface PublishedTopicItem {
  id: string
  label: string
  icon: string
  blurb: string
  total: number
  recent: number
  related: Array<{ label: string; to: string }>
  sample: PublishedTopicThread[]
}

export interface PublishedTopicsResponse {
  topics: PublishedTopicItem[]
  asOf: string | null
  empty: boolean
  subs: string[]
}
