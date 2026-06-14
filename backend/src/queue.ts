import { createAnalysisJob } from "./db";

export const addJob = async (videoUrl: string): Promise<string> => {
  console.log(`[Queue] Received URL for processing: ${videoUrl}`);
  return createAnalysisJob(videoUrl);
};
