/**
 * Mock data for testing adaptive testing and performance dashboard
 * These values are used as fallbacks when the API is not available
 */

/**
 * Mock overall performance data
 */
export const mockOverallPerformance = {
  total_tests_taken: 8,
  total_questions_attempted: 124,
  total_correct_answers: 89,
  avg_score_percentage: 71.8,
  avg_response_time_seconds: 42.3,
  easy_questions_accuracy: 85.2,
  medium_questions_accuracy: 68.4,
  hard_questions_accuracy: 52.1,
  last_updated: new Date().toISOString()
};

/**
 * Mock topic performance data
 */
export const mockTopicPerformance = [
  {
    topic: 'Human Resources',
    total_questions: 45,
    correct_answers: 32,
    accuracy_percentage: 71.1,
    avg_response_time_seconds: 35.2
  },
  {
    topic: 'Industrial Relations',
    total_questions: 28,
    correct_answers: 21,
    accuracy_percentage: 75.0,
    avg_response_time_seconds: 45.8
  },
  {
    topic: 'Labor Laws',
    total_questions: 32,
    correct_answers: 19,
    accuracy_percentage: 59.4,
    avg_response_time_seconds: 50.1
  },
  {
    topic: 'Training & Development',
    total_questions: 19,
    correct_answers: 17,
    accuracy_percentage: 89.5,
    avg_response_time_seconds: 32.7
  }
];

/**
 * Mock difficulty performance data
 */
export const mockDifficultyPerformance = {
  easy: {
    total: 42,
    correct: 36,
    accuracy: 85.7,
    avg_time_seconds: 26.3
  },
  medium: {
    total: 56,
    correct: 38,
    accuracy: 67.9,
    avg_time_seconds: 42.8
  },
  hard: {
    total: 26,
    correct: 15,
    accuracy: 57.7,
    avg_time_seconds: 68.4
  }
};

/**
 * Mock time performance data
 */
export const mockTimePerformance = {
  trend: [
    { date: '2025-06-01', accuracy: 65.2, avg_time: 48.3 },
    { date: '2025-06-03', accuracy: 68.7, avg_time: 45.1 },
    { date: '2025-06-05', accuracy: 70.3, avg_time: 43.8 },
    { date: '2025-06-08', accuracy: 72.4, avg_time: 41.2 },
    { date: '2025-06-10', accuracy: 69.8, avg_time: 42.6 },
    { date: '2025-06-12', accuracy: 73.5, avg_time: 38.4 },
    { date: '2025-06-15', accuracy: 78.2, avg_time: 35.9 }
  ]
};

/**
 * Mock question data for adaptive tests
 */
export const mockQuestions = [
  // Easy questions
  {
    id: 1,
    question_text: 'What does HR stand for in business context?',
    difficulty_level: 'Easy',
    topic: 'Human Resources',
    options: [
      { id: 101, option_text: 'Human Resources', option_order: 1, is_correct: true },
      { id: 102, option_text: 'Health Records', option_order: 2, is_correct: false },
      { id: 103, option_text: 'Human Relations', option_order: 3, is_correct: false },
      { id: 104, option_text: 'Human Rights', option_order: 4, is_correct: false }
    ]
  },
  {
    id: 2,
    question_text: 'Which of these is typically a function of the HR department?',
    difficulty_level: 'Easy',
    topic: 'Human Resources',
    options: [
      { id: 105, option_text: 'Manufacturing products', option_order: 1, is_correct: false },
      { id: 106, option_text: 'Recruitment and selection', option_order: 2, is_correct: true },
      { id: 107, option_text: 'Product marketing', option_order: 3, is_correct: false },
      { id: 108, option_text: 'Financial auditing', option_order: 4, is_correct: false }
    ]
  },
  
  // Medium questions
  {
    id: 3,
    question_text: 'Which legislation pertains to workplace safety and health in India?',
    difficulty_level: 'Medium',
    topic: 'Labor Laws',
    options: [
      { id: 109, option_text: 'Companies Act', option_order: 1, is_correct: false },
      { id: 110, option_text: 'Factories Act', option_order: 2, is_correct: true },
      { id: 111, option_text: 'Competition Act', option_order: 3, is_correct: false },
      { id: 112, option_text: 'Banking Regulation Act', option_order: 4, is_correct: false }
    ]
  },
  {
    id: 4,
    question_text: 'What is the primary purpose of a job analysis?',
    difficulty_level: 'Medium',
    topic: 'Human Resources',
    options: [
      { id: 113, option_text: 'To determine employee salaries', option_order: 1, is_correct: false },
      { id: 114, option_text: 'To evaluate employee performance', option_order: 2, is_correct: false },
      { id: 115, option_text: 'To identify job duties and requirements', option_order: 3, is_correct: true },
      { id: 116, option_text: 'To establish company policies', option_order: 4, is_correct: false }
    ]
  },
  
  // Hard questions
  {
    id: 5,
    question_text: 'Under the Industrial Disputes Act, what is the maximum period of operation for a settlement arrived at during conciliation proceedings?',
    difficulty_level: 'Hard',
    topic: 'Industrial Relations',
    options: [
      { id: 117, option_text: '1 year', option_order: 1, is_correct: false },
      { id: 118, option_text: '2 years', option_order: 2, is_correct: false },
      { id: 119, option_text: '3 years', option_order: 3, is_correct: true },
      { id: 120, option_text: '5 years', option_order: 4, is_correct: false }
    ]
  },
  {
    id: 6,
    question_text: 'Which of the following is NOT a valid method for calculating the Return on Investment (ROI) of a training program?',
    difficulty_level: 'Hard',
    topic: 'Training & Development',
    options: [
      { id: 121, option_text: 'Phillips ROI Methodology', option_order: 1, is_correct: false },
      { id: 122, option_text: 'Kirkpatrick Model', option_order: 2, is_correct: false },
      { id: 123, option_text: 'Cost-Benefit Analysis', option_order: 3, is_correct: false },
      { id: 124, option_text: 'Pareto Efficiency Model', option_order: 4, is_correct: true }
    ]
  }
];

/**
 * Get mock next question based on current question ID and difficulty
 * 
 * @param currentQuestionId - Current question ID
 * @param difficulty - Target difficulty level
 * @returns Mock next question data
 */
export const getMockNextQuestion = (currentQuestionId: number, difficulty: string = 'Medium') => {
  // Filter questions by difficulty
  const questions = mockQuestions.filter(
    q => q.difficulty_level?.toLowerCase() === difficulty.toLowerCase()
  );
  
  // If no questions match the difficulty, return any question
  if (questions.length === 0) {
    return mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
  }
  
  // Find a different question than the current one
  const availableQuestions = questions.filter(q => q.id !== currentQuestionId);
  
  // If all questions of this difficulty have been used, return null to end the test
  if (availableQuestions.length === 0) {
    return null;
  }
  
  // Return a random question of the target difficulty
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
};
