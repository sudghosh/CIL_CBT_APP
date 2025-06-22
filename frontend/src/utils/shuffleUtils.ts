/**
 * Utility functions for shuffling question options while preserving original values
 * 
 * These functions randomize the order of options while keeping track of their original positions.
 * This ensures that when submitting answers, we can send the original option index to the backend 
 * for correct answer validation, while displaying options in a random order to the user.
 */

// Define an interface for objects with tracking properties
export interface WithOriginalValues {
  /**
   * The original index of the item in the array before shuffling
   */
  originalIndex?: number;
  
  /**
   * The original value of the preserved key (usually option_order) before shuffling
   * This is used when submitting answers to reference the correct option in the backend
   */
  originalPreservedValue?: any;
}

/**
 * Shuffles an array of objects while preserving the original values
 * Returns a new array with the same objects in a random order
 * Each object is assigned additional properties to track its initial position
 * 
 * @param array - The array to shuffle
 * @param preserveKey - The key in each object that should be preserved for reference (e.g. option_order)
 * @returns A new shuffled array with originalIndex and originalPreservedValue properties added to each item
 */
export function shuffleArray<T extends Record<string, any>>(array: T[], preserveKey: string = 'option_order'): (T & WithOriginalValues)[] {
  // Safeguard against invalid inputs
  if (!array || !Array.isArray(array)) return [];
  if (array.length <= 1) return [...array] as (T & WithOriginalValues)[];

  try {
    // Create a deep copy of the array with originalIndex properties
    const arrayWithIndices = array.map((item, index) => {
      // Create a new object to avoid mutating the original
      const newItem = { ...item } as T & WithOriginalValues;
      
      // Store the preserved value (option_order or index if not available)
      const preservedValue = item && typeof item === 'object' && preserveKey in item 
        ? item[preserveKey] 
        : index;
      
      // Add tracking properties for answer submission
      newItem.originalIndex = index;
      newItem.originalPreservedValue = preservedValue;
      
      return newItem;
    });

    // Fisher-Yates shuffle algorithm
    for (let i = arrayWithIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arrayWithIndices[i], arrayWithIndices[j]] = [arrayWithIndices[j], arrayWithIndices[i]];
    }

    return arrayWithIndices;
  } catch (error) {
    console.error('Error shuffling array:', error);
    // Return a copy of the original array if shuffling fails
    return array.map((item, index) => ({
      ...item, 
      originalIndex: index,
      originalPreservedValue: (item && typeof item === 'object' && preserveKey in item) ? item[preserveKey] : index
    }));
  }
}

/**
 * Shuffles options in multiple questions
 * Modifies each question's options array in place with shuffled options
 * 
 * @param questions - Array of questions with options
 * @returns The questions array with shuffled options
 */
export function shuffleOptionsInQuestions<T extends { options: any[], question_id?: number, question_text?: string }>(questions: T[]): T[] {
  if (!questions || !Array.isArray(questions)) return questions;

  return questions.map(question => {
    if (!question.options || !Array.isArray(question.options)) return question;

    return {
      ...question,
      options: shuffleArray(question.options, 'option_order')
    } as T;
  });
}
