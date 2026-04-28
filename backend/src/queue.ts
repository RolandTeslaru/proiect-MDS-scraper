
export const addJob = async (videoUrl: string): Promise<string> => {
  console.log(`[Queue] Received URL for processing: ${videoUrl}`);

  const jobId = crypto.randomUUID(); 


  return jobId;
};