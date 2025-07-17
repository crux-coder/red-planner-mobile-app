import { useSupabaseFunction } from "./useSupabaseFunction";

/**
 * Interface for the job-update function parameters
 */
export interface JobUpdateParams {
	jobId: string;
	projectId: string;
	message: string;
	image_urls?: string[];
}

/**
 * Custom hook for the job-update cloud function
 *
 * @param options Additional options for the function call
 * @returns A mutation object from TanStack Query
 */
export const useJobUpdate = (options?: any) => {
	return useSupabaseFunction<
		JobUpdateParams,
		{ success: boolean; jobUpdate: any }
	>("job-update", {
		invalidateQueries: ["jobUpdates", ...(options?.invalidateQueries || [])],
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
};
