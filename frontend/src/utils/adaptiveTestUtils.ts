/**
 * Utility functions for adaptive testing
 */

/**
 * Interface for question option data
 */
interface QuestionOption {
  id: number;
  option_text: string;
  option_order: number;
  is_correct?: boolean;
}

/**
 * Interface for question data
 */
interface Question {
  id: number;
  question_text: string;
  difficulty_level?: string;
  topic?: string;
  options: QuestionOption[];
}

/**
 * Calculate difficulty adjustment based on performance
 * 
 * @param currentDifficulty - Current difficulty level
 * @param performance - Performance score (0-1)
 * @param strategy - Adaptive strategy to use
 * @returns Next difficulty level to use
 */
export const calculateNextDifficulty = (
  currentDifficulty: string = 'Medium',
  performance: number = 0.5,
  strategy: string = 'progressive'
): string => {
  // Normalize the difficulty
  let normalizedDifficulty = currentDifficulty.toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
    normalizedDifficulty = 'medium';
  }
  
  switch (strategy) {
    case 'progressive':
      // Progressive strategy adjusts difficulty based on performance
      if (performance >= 0.7) {
        // Good performance, increase difficulty if possible
        if (normalizedDifficulty === 'easy') return 'Medium';
        if (normalizedDifficulty === 'medium') return 'Hard';
        return 'Hard';
      } else if (performance <= 0.4) {
        // Poor performance, decrease difficulty if possible
        if (normalizedDifficulty === 'hard') return 'Medium';
        if (normalizedDifficulty === 'medium') return 'Easy';
        return 'Easy';
      } else {
        // Maintain current difficulty
        return currentDifficulty;
      }
      
    case 'easy-first':
      // Start with easy, gradually increase
      if (performance >= 0.6 && normalizedDifficulty === 'easy') return 'Medium';
      if (performance >= 0.7 && normalizedDifficulty === 'medium') return 'Hard';
      return currentDifficulty;
      
    case 'hard-first':
      // Start with hard, gradually decrease if needed
      if (performance <= 0.3 && normalizedDifficulty === 'hard') return 'Medium';
      if (performance <= 0.4 && normalizedDifficulty === 'medium') return 'Easy';
      return currentDifficulty;
      
    case 'random':
      // Randomly select difficulty level
      const difficulties = ['Easy', 'Medium', 'Hard'];
      const randomIndex = Math.floor(Math.random() * 3);
      return difficulties[randomIndex];
      
    default:
      // Default to maintaining current difficulty
      return currentDifficulty;
  }
};

/**
 * Check if the user's answer is correct
 * 
 * @param question - Question data
 * @param selectedOption - Selected option ID
 * @returns Boolean indicating correctness
 */
export const checkAnswer = (
  question: Question,
  selectedOption: number
): boolean => {
  // Find the selected option
  const option = question.options.find(opt => opt.id === selectedOption);
  
  // Check if the option is marked as correct
  if (option?.is_correct !== undefined) {
    return option.is_correct;
  }
  
  // If no correct flag is available, assume the first option is correct (for testing)
  return question.options[0]?.id === selectedOption;
};

/**
 * Calculate performance score based on recent answers
 * 
 * @param answers - Array of recent answer correctness values
 * @returns Performance score (0-1)
 */
export const calculatePerformance = (answers: boolean[]): number => {
  if (!answers.length) return 0.5; // Default to middle performance
  
  // Count correct answers
  const correctCount = answers.filter(isCorrect => isCorrect).length;
  
  // Calculate percentage
  return correctCount / answers.length;
};

/**
 * Format time in seconds to minutes:seconds format
 * 
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTimeDisplay = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
