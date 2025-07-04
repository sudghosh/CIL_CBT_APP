/**
 * Test-related type definitions for the CIL CBT App
 */

export type DifficultyStrategy = 'hard_to_easy' | 'easy_to_hard' | 'balanced' | 'random';

export type TestType = 'Mock' | 'Practice' | 'Regular' | 'Adaptive';

export interface TestTemplateSection {
  paper_id: number;
  section_id?: number | null;
  subsection_id?: number | null;
  question_count: number;
}

export interface CreateTestTemplateRequest {
  template_name: string;
  test_type: TestType;
  sections: TestTemplateSection[];
  difficulty_strategy?: DifficultyStrategy;
}

export interface TestTemplate {
  template_id: number;
  template_name: string;
  test_type: TestType;
  created_by_user_id: number;
  created_at: string;
  is_active: boolean;
  difficulty_strategy?: DifficultyStrategy;
  sections: TestTemplateSection[];
}

export interface StartTestRequest {
  test_template_id: number;
  duration_minutes: number;
  is_adaptive?: boolean;
  adaptive_strategy?: string;
  max_questions?: number;
}

export interface TestAttempt {
  attempt_id: number;
  test_type: TestType;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  total_allotted_duration_minutes: number;
  status: 'InProgress' | 'Completed' | 'Abandoned';
  score?: number;
  weighted_score?: number;
  is_adaptive: boolean;
}

export interface Question {
  question_id: number;
  question_text: string;
  paper_id: number;
  section_id?: number;
  subsection_id?: number;
  options: QuestionOption[];
  correct_option_index: number;
  explanation?: string;
  difficulty_level?: string;
}

export interface QuestionOption {
  option_text: string;
  option_order: number;
}

export interface TestAnswer {
  question_id: number;
  selected_option_index?: number;
  time_taken_seconds: number;
  is_marked_for_review: boolean;
}
