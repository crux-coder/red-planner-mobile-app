import { useCompleteJob } from './useSupabaseFunction';
import { useSupabase } from '@/context/supabase-provider';

/**
 * Custom hook for job-related actions
 * Provides methods for completing jobs using the Supabase cloud function
 */
export const useJobActions = () => {
  const { userProfile } = useSupabase();
  
  // Use the complete-job cloud function with TanStack Query
  const completeJobMutation = useCompleteJob({
    invalidateQueries: ['jobs'],
    onError: (error) => {
      console.error('Error completing job:', error);
    }
  });

  /**
   * Complete a job using the Supabase cloud function
   * @param jobId The ID of the job to complete
   * @returns A promise that resolves when the job is completed
   */
  const completeJob = async (jobId: string) => {
    if (!jobId) return;

    try {
      await completeJobMutation.mutateAsync({ jobId });
      return true;
    } catch (error) {
      console.error('Error completing job:', error);
      throw error;
    }
  };

  return {
    completeJob,
    isCompletingJob: completeJobMutation.isPending,
  };
};
