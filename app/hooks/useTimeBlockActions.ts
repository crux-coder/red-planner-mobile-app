import { useEditTimeBlock, EditTimeBlockParams } from './useSupabaseFunction';
import { TimeBlock } from '@/app/models/types';
import { toLocalTimestamp } from '@/lib/utils';

/**
 * Custom hook for time block-related actions
 * Provides methods for editing time blocks using the Supabase cloud function
 */
export const useTimeBlockActions = () => {
  // Use the edit-time-block cloud function with TanStack Query
  const editTimeBlockMutation = useEditTimeBlock({
    invalidateQueries: ['timeBlocks', 'shifts', 'currentShift'],
    onError: (error) => {
      console.error('Error editing time block:', error);
    }
  });

  /**
   * Edit a time block using the Supabase cloud function
   * @param timeBlockId The ID of the time block to edit
   * @param startTime The new start time
   * @param endTime The new end time (optional)
   * @param coefficient The new coefficient
   * @param category The new category
   * @param notes The new notes (optional)
   * @returns A promise that resolves to the updated time block
   */
  const editTimeBlock = async (
    timeBlockId: string,
    startTime: Date,
    endTime: Date | null,
    coefficient: number,
    category: string,
    notes?: string
  ): Promise<TimeBlock> => {
    if (!timeBlockId) {
      throw new Error('Time block ID is required');
    }

    try {
      // Create params object with required fields
      const params: EditTimeBlockParams = {
        timeBlockId,
        startTime: toLocalTimestamp(startTime),
        coefficient,
        category,
        notes: notes || ''
      };

      // Only add endTime if it exists (don't send null)
      if (endTime) {
        params.endTime = toLocalTimestamp(endTime);
      }

      const result = await editTimeBlockMutation.mutateAsync(params);
      return result.timeBlock as TimeBlock;
    } catch (error) {
      console.error('Error editing time block:', error);
      throw error;
    }
  };

  return {
    editTimeBlock,
    isEditingTimeBlock: editTimeBlockMutation.isPending,
  };
};
