export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type Verdict = 'disinformation' | 'authentic' | null

export interface Job {
  id: string
  url: string
  status: JobStatus
  verdict: Verdict
  confidence: number | null
  submittedAt: string
  processedAt: string | null
  evidence?: string
  reasons?: string[]
}

export const MOCK_JOBS: Job[] = [
  {
    id: 'job_1',
    url: 'https://tiktok.com/@breakingnews_ro/video/7384920183746',
    status: 'done',
    verdict: 'disinformation',
    confidence: 0.94,
    submittedAt: '2026-04-28T10:00:00Z',
    processedAt: '2026-04-28T10:02:30Z',
    evidence:
      'The video contains claims that contradict verified scientific consensus. Multiple statements were flagged as factually incorrect by cross-referencing with authoritative sources. The presenter uses emotional language and out-of-context statistics to mislead viewers.',
    reasons: [
      'Contains verifiably false statistics about vaccine efficacy',
      'Uses manipulative framing and selective data presentation',
      'Audio-visual inconsistencies detected — possible splice edits',
      'Source account has documented history of spreading health misinformation',
    ],
  },
  {
    id: 'job_2',
    url: 'https://tiktok.com/@antena3oficial/video/7384123456789',
    status: 'done',
    verdict: 'authentic',
    confidence: 0.87,
    submittedAt: '2026-04-28T09:30:00Z',
    processedAt: '2026-04-28T09:32:10Z',
    evidence:
      'The video presents factual reporting with verifiable sources. All major claims align with established news records and official government statements. No manipulation of audio or visual elements was detected.',
    reasons: [
      'Claims verified against official government and WHO sources',
      'Balanced presentation of viewpoints across stakeholders',
      'Account is a verified licensed news broadcaster',
      'No synthetic media elements detected',
    ],
  },
  {
    id: 'job_3',
    url: 'https://tiktok.com/@geopolitics_today/video/7385000000001',
    status: 'processing',
    verdict: null,
    confidence: null,
    submittedAt: '2026-04-28T10:15:00Z',
    processedAt: null,
  },
  {
    id: 'job_4',
    url: 'https://tiktok.com/@viral_claims/video/7383000000002',
    status: 'done',
    verdict: 'disinformation',
    confidence: 0.76,
    submittedAt: '2026-04-27T14:00:00Z',
    processedAt: '2026-04-27T14:03:00Z',
    evidence:
      'The video promotes unverified conspiracy theories about electoral fraud. The claims lack supporting evidence and are directly refuted by official electoral commission records. Footage used is out of context and sourced from a different country.',
    reasons: [
      'Unsubstantiated electoral fraud claims with no supporting evidence',
      'Video uses footage from a different country and context',
      'Narrative structure designed to incite distrust in institutions',
    ],
  },
  {
    id: 'job_5',
    url: 'https://tiktok.com/@digi24ro/video/7382000000003',
    status: 'done',
    verdict: 'authentic',
    confidence: 0.91,
    submittedAt: '2026-04-27T12:00:00Z',
    processedAt: '2026-04-27T12:01:45Z',
    evidence:
      'Standard news reporting with accurate, verifiable information. The content was corroborated by multiple independent news agencies. The broadcaster is a well-established and regulated news organisation.',
    reasons: [
      'Verified news organization with active broadcast license',
      'Content corroborated by Reuters and AFP wire reports',
      'No manipulated media detected across all frames',
      'Transparent attribution of all cited sources',
    ],
  },
  {
    id: 'job_6',
    url: 'https://tiktok.com/@truth_seeker99/video/7385000000004',
    status: 'pending',
    verdict: null,
    confidence: null,
    submittedAt: '2026-04-28T10:20:00Z',
    processedAt: null,
  },
  {
    id: 'job_7',
    url: 'https://tiktok.com/@warroom_official/video/7381000000005',
    status: 'done',
    verdict: 'disinformation',
    confidence: 0.89,
    submittedAt: '2026-04-27T08:00:00Z',
    processedAt: '2026-04-27T08:04:15Z',
    evidence:
      'The video presents doctored evidence and deliberately misleading narratives designed to inflame social tensions. AI analysis detected synthetic media elements including audio deepfake signatures consistent with GAN-generated content.',
    reasons: [
      'Synthetic audio deepfake signatures detected (GAN fingerprint match)',
      'Doctored visual evidence presented as authentic footage',
      'Deliberately misleading narrative structure targeting ethnic tensions',
      'Account is flagged as a known state-linked disinformation operation',
    ],
  },
  {
    id: 'job_8',
    url: 'https://tiktok.com/@factcheck_eu/video/7380000000006',
    status: 'failed',
    verdict: null,
    confidence: null,
    submittedAt: '2026-04-26T16:00:00Z',
    processedAt: null,
  },
]
