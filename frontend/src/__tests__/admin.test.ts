import { authAPI, questionsAPI, papersAPI } from '../services/api';
import { APIError } from '../utils/errorHandler';

const validQuestionData = {
  question_text: 'What is Human Resource Management?',
  question_type: 'MCQ',
  correct_option_index: 0,
  explanation: 'HRM is a strategic approach to managing employment relations',
  paper_id: 1,
  section_id: 1,
  default_difficulty_level: 'Medium',
  options: [
    { option_text: 'Strategic management of people in an organization', option_order: 0 },
    { option_text: 'Financial planning for a company', option_order: 1 },
    { option_text: 'Marketing strategy development', option_order: 2 },
    { option_text: 'Production process management', option_order: 3 }
  ]
};

describe('Admin Question Management', () => {
  it('should create a question successfully', async () => {
    const response = await questionsAPI.createQuestion(validQuestionData);
    expect(response.data).toHaveProperty('question_id');
    expect(response.data.question_text).toBe(validQuestionData.question_text);
    expect(response.data.is_active).toBe(true);
  });

  it('should handle validation errors', async () => {
    const invalidData = { ...validQuestionData, options: [] };
    try {
      await questionsAPI.createQuestion(invalidData);
      fail('Expected error to be thrown');
    } catch (error) {
      if (error instanceof APIError) {
        expect(error.status).toBe(400);
      } else {
        fail('Expected APIError to be thrown');
      }
    }
  });

  it('should handle unauthorized access', async () => {
    localStorage.removeItem('token');
    try {
      await questionsAPI.createQuestion(validQuestionData);
      fail('Expected error to be thrown');
    } catch (error) {
      if (error instanceof APIError) {
        expect(error.status).toBe(401);
      } else {
        fail('Expected APIError to be thrown');
      }
    }
  });
});

describe('Admin Paper Management', () => {
  const validPaperData = {
    paper_name: 'Test Paper',
    total_marks: 100,
    description: 'Test paper description',
    sections: [
      {
        section_name: 'General Knowledge',
        marks_allocated: 20,
        description: 'Basic GK questions',
        subsections: [
          { subsection_name: 'Current Affairs', description: 'Latest events' }
        ]
      }
    ]
  };

  it('should create a paper successfully', async () => {
    const response = await papersAPI.createPaper(validPaperData);
    expect(response.data).toHaveProperty('paper_id');
    expect(response.data.paper_name).toBe(validPaperData.paper_name);
    expect(response.data.is_active).toBe(true);
  });

  it('should handle paper validation errors', async () => {
    const invalidData = { ...validPaperData, total_marks: -100 };
    try {
      await papersAPI.createPaper(invalidData);
      fail('Expected error to be thrown');
    } catch (error) {
      if (error instanceof APIError) {
        expect(error.status).toBe(400);
      } else {
        fail('Expected APIError to be thrown');
      }
    }
  });
});

describe('Admin User Management', () => {
  it('should fetch users successfully', async () => {
    const response = await authAPI.getUsers();
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should update user role successfully', async () => {
    const response = await authAPI.updateUserRole(2, 'Admin');
    expect(response.data.role).toBe('Admin');
  });

  it('should update user status successfully', async () => {
    const response = await authAPI.updateUserStatus(2, false);
    expect(response.data.is_active).toBe(false);
  });

  it('should handle role update validation', async () => {
    try {
      await authAPI.updateUserRole(2, 'InvalidRole');
      fail('Expected error to be thrown');
    } catch (error) {
      if (error instanceof APIError) {
        expect(error.status).toBe(400);
      } else {
        fail('Expected APIError to be thrown');
      }
    }
  });
});
