import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";

interface SupabaseFunctionOptions {
	/**
	 * Optional invalidation keys for the query client
	 * These are the query keys that should be invalidated when the function completes
	 */
	invalidateQueries?: string[];

	/**
	 * Optional callback to be executed on success
	 */
	onSuccess?: (data: any) => void;

	/**
	 * Optional callback to be executed on error
	 */
	onError?: (error: Error) => void;
}

/**
 * Custom hook for invoking Supabase edge functions
 *
 * @param functionName The name of the Supabase edge function to call
 * @param options Additional options for the function call
 * @returns A mutation object from TanStack Query
 */
export const useSupabaseFunction = <TParams = any, TResponse = any>(
	functionName: string,
	options?: SupabaseFunctionOptions,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params?: TParams): Promise<TResponse> => {
			try {
				const { data, error } = await supabase.functions.invoke(functionName, {
					body: params || {},
				});

				if (error) {
					let errorMessage = "Unknown error";

					try {
						// Try to parse the error context as JSON
						if (error.context) {
							const contextData = await error.context.json();
							errorMessage =
								typeof contextData === "string"
									? contextData
									: JSON.stringify(contextData);
						} else {
							// Fallback to error message if context is not available
							errorMessage = error.message || String(error);
						}
					} catch (parseError) {
						// If JSON parsing fails, use the original error message
						errorMessage = error.message || String(error);
						console.error(`Error parsing error context: ${parseError}`);
					}

					console.error(
						`Error invoking ${functionName} function:`,
						errorMessage,
					);
					throw new Error(`Failed to invoke ${functionName}: ${errorMessage}`);
				}

				return data as TResponse;
			} catch (unexpectedError) {
				// Handle any unexpected errors that might occur
				const errorMessage =
					unexpectedError instanceof Error
						? unexpectedError.message
						: String(unexpectedError);

				console.error(
					`Unexpected error in ${functionName} function:`,
					unexpectedError,
				);
				throw new Error(`Error in ${functionName}: ${errorMessage}`);
			}
		},
		onSuccess: (data) => {
			// Invalidate queries if specified
			if (options?.invalidateQueries?.length) {
				options.invalidateQueries.forEach((key) => {
					queryClient.invalidateQueries({ queryKey: [key] });
				});
			}

			// Call the success callback if provided
			if (options?.onSuccess) {
				options.onSuccess(data);
			}
		},
		onError: (error: Error) => {
			// Call the error callback if provided
			if (options?.onError) {
				options.onError(error);
			}
		},
	});
};

/**
 * Specialized hook for the complete-job function
 *
 * @param options Additional options for the function call
 * @returns A mutation object from TanStack Query
 */
export const useCompleteJob = (options?: SupabaseFunctionOptions) => {
	return useSupabaseFunction<{ jobId: string }, { success: boolean }>(
		"complete-job",
		{
			invalidateQueries: ["jobs", ...(options?.invalidateQueries || [])],
			onSuccess: options?.onSuccess,
			onError: options?.onError,
		},
	);
};

/**
 * Interface for the edit-time-block function parameters
 */
export interface EditTimeBlockParams {
	timeBlockId: string;
	startTime: string;
	endTime?: string; // Make endTime optional but not nullable
	coefficient: number;
	category: string;
	notes?: string;
}

/**
 * Custom hook for the edit-time-block cloud function
 *
 * @param options Additional options for the function call
 * @returns A mutation object from TanStack Query
 */
export const useEditTimeBlock = (options?: SupabaseFunctionOptions) => {
	return useSupabaseFunction<EditTimeBlockParams, { success: boolean, timeBlock: any }>(
		"edit-time-block",
		{
			invalidateQueries: ["timeBlocks", "shifts", ...(options?.invalidateQueries || [])],
			onSuccess: options?.onSuccess,
			onError: options?.onError,
		},
	);
};
