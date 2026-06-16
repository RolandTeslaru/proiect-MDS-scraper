import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export type AnalyzeVideoPayload = {
  url: string
}

export type AnalyzeVideoResponse = {
  message: string
  jobId: string
}

export const analysisService = {
  async analyzeVideo(payload: AnalyzeVideoPayload) {
    const { data } = await api.post<AnalyzeVideoResponse>('/analyze', payload)
    return data
  },
}

export interface TikTokComment {
  author: string
  text: string
  likes: string
}

export interface TikTokVideo {
  url: string
  comments: TikTokComment[]
}

export interface SearchResult {
  videos: TikTokVideo[]
}

export const searchService = {
  async search(query: string): Promise<SearchResult> {
    const { data } = await api.post<SearchResult>('/search', { query })
    return data
  },
}

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health')
    return response.status === 200 && response.data.ok === true
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type Verdict = 'disinformation' | 'authentic' | null

export interface Job {
  id: string
  sourceUrl: string
  status: JobStatus
  createdAt: string
  verdict: Verdict
  confidence: number | null
  processedAt: string | null
  evidence: string | null
  reasons: string[] | null
}

export interface JobComment {
  id: string
  author: string
  text: string
  likes: string
  position: number
}

export interface JobDetail extends Job {
  comments: JobComment[]
}

export const jobsService = {
  async list(limit = 50): Promise<Job[]> {
    const { data } = await api.get<{ jobs: Job[] }>('/jobs', { params: { limit } })
    return data.jobs
  },

  async getById(id: string): Promise<JobDetail> {
    const { data } = await api.get<JobDetail>(`/jobs/${id}`)
    return data
  },

  // Start analyzing an existing (scraped-but-pending) job.
  async run(id: string): Promise<void> {
    await api.post(`/jobs/${id}/run`)
  },

  // Start analyzing every pending job at once.
  async runPending(): Promise<number> {
    const { data } = await api.post<{ started: number }>('/jobs/run-pending')
    return data.started
  },
}
