// Shape of the quarterly AI analysis served by /api/temas-analysis (proxied from the backend's
// GET /temas-analysis). Mirrors classes/temas-analysis/refresh.ts. Pure module: shared by the
// proxy route and the page. The empty baseline lets the page render from live demand alone when the
// analysis has not been generated yet or the backend is unreachable.
export interface TopicInsight {
  id: string
  trend: 'up' | 'down' | 'stable'
  insight: string
}

export interface TemasAnalysis {
  overview: string[]
  topics: TopicInsight[]
  sources: Array<{ label: string; url: string }>
  asOf: string | null
}

export function emptyTemasAnalysis(): TemasAnalysis {
  return { overview: [], topics: [], sources: [], asOf: null }
}
