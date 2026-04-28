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

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health')
    return response.status === 200 && response.data.ok === true
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}
