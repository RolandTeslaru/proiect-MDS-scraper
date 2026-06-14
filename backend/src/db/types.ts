export interface TikTokComment {
  author: string;
  text: string;
  likes: string;
}

export interface TikTokVideo {
  url: string;
  comments: TikTokComment[];
}

export interface SearchResult {
  videos: TikTokVideo[];
}

export interface ScrapeRunSummary {
  id: string;
  query: string;
  createdAt: string;
  videoCount: number;
}

export interface StoredComment {
  id: string;
  author: string;
  text: string;
  likes: string;
  position: number;
}

export interface StoredVideo {
  id: string;
  url: string;
  position: number;
  comments: StoredComment[];
}

export interface StoredScrapeRun extends ScrapeRunSummary {
  videos: StoredVideo[];
}
