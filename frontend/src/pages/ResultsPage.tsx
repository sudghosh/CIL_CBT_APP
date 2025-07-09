import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Chip,
  Avatar,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';

// Extend jsPDF type to include autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => jsPDF;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// TestQuestion interface to handle both standard and adaptive test questions
interface TestQuestion {
  question_id: number | string;
  question_text: string;
  selected_option_index?: number | string | null;
  selected_option?: number | string | null;
  answer?: number | string | null;
  correct_option_index?: number | string | null;
  correct_option?: number | string | null;
  correct_answer?: number | string | null;
  is_correct?: boolean;
  explanation?: string;
  feedback?: string;
  options?: Array<TestOption | string | any[]>;
  choices?: Array<TestOption | string | any[]>;
  
  // Adaptive test specific fields
  adaptive_result?: boolean | string | number;
  difficulty_adjustment?: string;
  difficulty_level?: string | number;
  is_attempted?: boolean;
  score_value?: number;
  marks?: number | string | boolean | null; // Added marks property for adaptive tests
}

// Options can come in various formats
interface TestOption {
  option_id?: number | string;
  id?: number | string;
  option_text?: string;
  text?: string;
  value?: string;
  option_order?: number;
  order?: number;
}

interface TestResult {
  attempt_id: number;
  test_type: string;
  start_time: string;
  end_time: string;
  score: number;
  weighted_score: number;
  duration_minutes: number;
  total_allotted_duration_minutes: number;
  status: 'InProgress' | 'Completed' | 'Abandoned'; // Added status field
  is_adaptive?: boolean;  // Added is_adaptive flag
  
  // Additional fields for test time/duration
  duration?: number | string;
  test_duration?: number | string;
  time_limit?: number | string;
  
  // Adaptive test specific fields
  adaptive_strategy_chosen?: string;
  questions_attempted?: number;
  total_possible_questions?: number;
  difficulty_level_final?: string | number;
  difficulty_progression?: Array<any>;
  
  // Add potential user information fields that might be in the API response
  user_name?: string;
  candidate_name?: string;
  user_id?: string;
  candidate_id?: string;
  email?: string;
  phone?: string;
}

interface TestDetails {
  questions: Array<{
    question_id: number | string;
    question_text: string;
    selected_option_index: number | string | null;
    correct_option_index: number | string | null;
    is_correct: boolean;
    explanation?: string;
    options: Array<{
      option_id: number | string;
      option_text: string;
      option_order: number;
    }>;
    // Adaptive test specific fields
    adaptive_result?: boolean | string | number;
    difficulty_adjustment?: string;
    difficulty_level?: string | number;
    is_attempted?: boolean;
    score_value?: number; // Some adaptive questions may have weighted scores
    marks?: number | string | boolean | null; // Added marks property for adaptive tests
  }>;
  is_adaptive?: boolean;  // Added is_adaptive flag
  start_time?: string;    // Test start time
  total_possible_questions?: number; // Total question pool size for adaptive tests
  questions_attempted?: number;      // Number of questions actually attempted
  user_info?: {           // Added user info field
    name: string;
    id: string;
    email?: string;    phone?: string;
  };
  test_info?: {           // Added test info field
    title: string;
    category: string;
    date: string;
    id?: string | number;  // Test ID added
    test_time?: string;    // Test time added
  }
}

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedTestResult, setSelectedTestResult] = useState<TestResult | null>(null);
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const theme = useTheme();
  
  // Removed recalculated scores state - now using backend scores directly
  // const [recalculatedScores, setRecalculatedScores] = useState<Record<number, { score: number; isRecalculated: boolean; displayText: string }>>({});
  
  // Helper function to extract user info from API response
  const getUserInfo = (data: any) => {
    try {
      // Log the available user data structure for debugging
      console.log('User Info Extraction - Available data structures:', {
        hasUserInfo: !!data.user_info,
        hasUser: !!data.user,
        hasCandidate: !!data.candidate,
        hasAttempt: !!data.attempt,
        hasAttemptDetails: !!data.attempt_details,
        hasMeta: !!data.meta,
        hasCreatedBy: !!data.created_by,
        hasExaminee: !!data.examinee,
        hasAuthUser: !!user
      });

      // Initialize with defaults - prefer authenticated user if available
      let userInfo = { 
        name: user ? `${user.first_name} ${user.last_name}` : 'Candidate', 
        id: user ? user.user_id.toString() : 'Unknown',
        email: user ? user.email : 'N/A',
        phone: 'N/A'
      };
      
      // Case 1: Direct user_info object
      if (data.user_info) {
        console.log('Found user_info structure:', data.user_info);
        userInfo = {
          ...userInfo,
          ...data.user_info,
          // Ensure these fields exist
          name: data.user_info.name || data.user_info.full_name || data.user_info.username || 'Candidate',
          id: data.user_info.id || data.user_info.user_id || 'Unknown',
          email: data.user_info.email || 'N/A'
        };
      } 
      // Case 2: User object
      else if (data.user) {
        console.log('Found user structure:', data.user);
        userInfo = {
          ...userInfo,
          name: data.user.name || data.user.username || data.user.full_name || 'Candidate',
          id: data.user.id || data.user.user_id || 'Unknown',
          email: data.user.email || data.user.mail || 'N/A',
          phone: data.user.phone || data.user.phone_number || data.user.contact || 'N/A'
        };
      } 
      // Case 3: Candidate object
      else if (data.candidate) {
        console.log('Found candidate structure:', data.candidate);
        userInfo = {
          ...userInfo,
          name: data.candidate.name || data.candidate.full_name || 'Candidate',
          id: data.candidate.id || data.candidate.candidate_id || 'Unknown',
          email: data.candidate.email || 'N/A',
          phone: data.candidate.phone || data.candidate.phone_number || 'N/A'
        };
      }
      // Case 4: examinee object
      else if (data.examinee) {
        console.log('Found examinee structure:', data.examinee);
        userInfo = {
          ...userInfo,
          name: data.examinee.name || data.examinee.full_name || 'Candidate',
          id: data.examinee.id || data.examinee.examinee_id || 'Unknown',
          email: data.examinee.email || 'N/A',
          phone: data.examinee.phone || 'N/A'
        };
      }
      // Case 5: attempt with user info
      else if (data.attempt && (data.attempt.user || data.attempt.candidate)) {
        const userSource = data.attempt.user || data.attempt.candidate;
        console.log('Found user info in attempt:', userSource);
        userInfo = {
          ...userInfo,
          name: userSource.name || userSource.username || userSource.full_name || 'Candidate',
          id: userSource.id || userSource.user_id || userSource.candidate_id || 'Unknown',
          email: userSource.email || 'N/A',
          phone: userSource.phone || userSource.phone_number || 'N/A'
        };
      }
      // Case 6: look for user info in meta or other common locations
      else if (data.meta && (data.meta.user || data.meta.candidate || data.meta.examinee)) {
        const userSource = data.meta.user || data.meta.candidate || data.meta.examinee;
        console.log('Found user info in meta:', userSource);
        userInfo = {
          ...userInfo,
          name: userSource.name || userSource.username || userSource.full_name || 'Candidate',
          id: userSource.id || 'Unknown',
          email: userSource.email || 'N/A',
          phone: userSource.phone || 'N/A'
        };
      }
      // Case 7: created_by might contain user info
      else if (data.created_by) {
        console.log('Found created_by structure:', data.created_by);
        userInfo = {
          ...userInfo,
          name: data.created_by.name || data.created_by.username || 'Candidate',
          id: data.created_by.id || 'Unknown',
          email: data.created_by.email || 'N/A'
        };
      }
      
      // Log the final extracted user info
      console.log('Final extracted user info:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('Error extracting user info:', error);
      return { 
        name: 'Candidate', 
        id: 'Unknown',
        email: 'N/A',
        phone: 'N/A' 
      };
    }
  };
  // Helper function to extract test info from API response and selected test result
  const getTestInfo = (apiData: any, testResult: TestResult | null) => {
    try {
      // Default test info structure
      let testInfo = { 
        title: 'Test', 
        category: 'Assessment',
        date: new Date().toLocaleDateString(),
        id: 'N/A',
        test_time: 'N/A'
      };
      
      // Try to extract test_time from various places in the API response
      let extractedTestTime = 'N/A';
      
      // Case 1: Extract from test_info if available
      if (apiData.test_info) {
        testInfo = {...apiData.test_info};
        
        // If test_time is missing but available elsewhere
        if (!testInfo.test_time) {
          if (apiData.test_time) extractedTestTime = apiData.test_time;
          else if (apiData.duration) {
            extractedTestTime = typeof apiData.duration === 'number' ? 
                             `${apiData.duration} minutes` : apiData.duration;
          }
          else if (apiData.time_limit) {
            extractedTestTime = typeof apiData.time_limit === 'number' ? 
                             `${apiData.time_limit} minutes` : apiData.time_limit;
          }
          
          testInfo.test_time = extractedTestTime;
        }
      } 
      // Case 2: Extract from test object if available
      else if (apiData.test) {
        const test = apiData.test;
        
        // Extract test time from test object
        if (test.test_time) extractedTestTime = test.test_time;
        else if (test.duration) {
          extractedTestTime = typeof test.duration === 'number' ? 
                          `${test.duration} minutes` : test.duration;
        }
        else if (test.time_limit) {
          extractedTestTime = typeof test.time_limit === 'number' ? 
                          `${test.time_limit} minutes` : test.time_limit;
        }
        
        testInfo = {
          title: test.title || test.name || 'Test',
          category: test.category || test.type || 'Assessment',
          date: test.date || new Date().toLocaleDateString(),
          id: test.id || test.test_id || 'N/A',
          test_time: extractedTestTime
        };
      }
      
      // Override with test result data if available
      if (testResult) {
        extractedTestTime = 'N/A';
        
        // Try to extract test time from testResult
        if (testResult.total_allotted_duration_minutes) {
          extractedTestTime = `${testResult.total_allotted_duration_minutes} minutes`;
        } 
        else if (testResult.duration_minutes) {
          extractedTestTime = `${testResult.duration_minutes} minutes`;
        }
        else if (testResult.duration) {
          extractedTestTime = typeof testResult.duration === 'number' ? 
                          `${testResult.duration} minutes` : testResult.duration;
        }
        else if (testResult.test_duration) {
          extractedTestTime = typeof testResult.test_duration === 'number' ? 
                          `${testResult.test_duration} minutes` : testResult.test_duration;
        }        else if (testResult.time_limit) {
          extractedTestTime = typeof testResult.time_limit === 'number' ? 
                          `${testResult.time_limit} minutes` : testResult.time_limit;
        }
        
        // Update test info with test result data
        testInfo = {
          ...testInfo,
          title: testResult.test_type || testInfo.title,
          category: testResult.is_adaptive ? 'Adaptive Assessment' : 'Standard Assessment',
          date: new Date(testResult.start_time).toLocaleDateString(),
          id: testResult.attempt_id?.toString() || testInfo.id || 'N/A',
          test_time: extractedTestTime
        };
                        
        testInfo = {          ...testInfo,
          title: testResult.test_type || testInfo.title,
          category: testResult.is_adaptive ? 'Adaptive Assessment' : 'Standard Assessment',
          date: new Date(testResult.start_time).toLocaleDateString(),
          id: testResult.attempt_id?.toString() || testInfo.id || 'N/A',
          test_time: extractedTestTime
        };
      }
      
      return testInfo;
    } catch (error) {
      console.error('Error extracting test info:', error);      return { 
        title: 'Test', 
        category: 'Assessment',
        date: new Date().toLocaleDateString(),
        id: 'N/A',
        test_time: 'N/A'
      };
    }
  };
  


  // Helper function to determine if an answer is correct with robust handling of different data formats
  const determineIfCorrect = (question: any, isAdaptiveTest: boolean = false): boolean => {
    // Enhanced debug logging for adaptive tests
    if (isAdaptiveTest) {
      console.log(`🎯 [CORRECTNESS-CHECK] Checking question:`, {
        marks: question.marks,
        is_correct: question.is_correct,
        selected_option_index: question.selected_option_index,
        correct_option_index: question.correct_option_index,
        allProperties: Object.keys(question)
      });
    }
    
    // Case 1: Check marks field first (this is the primary indicator from backend)
    if (question.marks !== undefined) {
      if (question.marks === null) {
        console.log(`🎯 [CORRECTNESS-CHECK] Marks is null (question not attempted):`, question.marks);
        return false; // null marks means unanswered/not attempted
      }
      
      console.log(`🎯 [CORRECTNESS-CHECK] Using marks field:`, {
        original: question.marks,
        type: typeof question.marks
      });
      
      // Convert marks to number for comparison, handling string/number/boolean types
      let marksValue = question.marks;
      if (typeof marksValue === 'string') {
        marksValue = parseFloat(marksValue);
        // Handle case where parseFloat returns NaN
        if (isNaN(marksValue)) {
          console.warn(`🚨 [CORRECTNESS-CHECK] Invalid marks value, treating as 0:`, question.marks);
          marksValue = 0;
        }
      } else if (typeof marksValue === 'boolean') {
        marksValue = marksValue ? 1 : 0;
      }
      
      const result = marksValue > 0;
      console.log(`🎯 [CORRECTNESS-CHECK] Marks result: ${result} (converted value: ${marksValue})`);
      // marks = 1.0 for correct, 0.0 for incorrect, null for unanswered
      return result;
    } else if (isAdaptiveTest) {
      console.log(`⚠️ [CORRECTNESS-CHECK] No marks field found for adaptive test question!`, 'Available fields:', Object.keys(question));
    }
    
    // Case 2: Explicit is_correct property exists
    if (question.is_correct !== undefined) {
      console.log(`🎯 [CORRECTNESS-CHECK] Using explicit is_correct property:`, question.is_correct);
      // Handle boolean, string, or number types
      if (typeof question.is_correct === 'boolean') return question.is_correct;
      if (typeof question.is_correct === 'string') return question.is_correct.toLowerCase() === 'true';
      if (typeof question.is_correct === 'number') return question.is_correct !== 0;
    }
    
    // Case 3: Alternative property names
    const alternativeProps = ['correct', 'isCorrect', 'is_right', 'right', 'isRight', 'correctness'];
    for (const prop of alternativeProps) {
      if (question[prop] !== undefined) {
        console.log(`🎯 [CORRECTNESS-CHECK] Using alternative property ${prop}:`, question[prop]);
        if (typeof question[prop] === 'boolean') return question[prop];
        if (typeof question[prop] === 'string') return question[prop].toLowerCase() === 'true';
        if (typeof question[prop] === 'number') return question[prop] !== 0;
      }
    }
    
    // Case 4: Compare selected and correct indices (fallback method)
    const selectedIndex = question.selected_option_index !== undefined ? question.selected_option_index :
                          question.selected_option !== undefined ? question.selected_option :
                          question.answer !== undefined ? question.answer : null;
                          
    const correctIndex = question.correct_option_index !== undefined ? question.correct_option_index :
                       question.correct_option !== undefined ? question.correct_option :
                       question.correct_answer !== undefined ? question.correct_answer : null;
                       
    if (isAdaptiveTest) {
      console.log(`🎯 [CORRECTNESS-CHECK] Option indices comparison:`, {
        selected: selectedIndex,
        correct: correctIndex,
        selectedType: typeof selectedIndex,
        correctType: typeof correctIndex
      });
    }
                       
    // If both indices are available, compare them
    if (selectedIndex !== null && selectedIndex !== undefined && 
        correctIndex !== null && correctIndex !== undefined) {
      console.log(`🎯 [CORRECTNESS-CHECK] Comparing selected index ${selectedIndex} with correct index ${correctIndex}`);
      // Handle both string and numeric comparisons
      if (typeof selectedIndex === 'string' && typeof correctIndex === 'string') {
        const result = selectedIndex.trim().toLowerCase() === correctIndex.trim().toLowerCase();
        console.log(`🎯 [CORRECTNESS-CHECK] String comparison result: ${result}`);
        return result;
      }
      const result = selectedIndex === correctIndex;
      console.log(`🎯 [CORRECTNESS-CHECK] Direct comparison result: ${result}`);
      return result;
    }
    
    // Case 5: For adaptive tests, if no clear indicator is found, we need to be more careful
    if (isAdaptiveTest) {
      console.warn(`🚨 [CORRECTNESS-CHECK] Could not determine correctness for adaptive test question!`, {
        availableFields: Object.keys(question),
        questionData: question
      });
      // For adaptive tests, if we can't determine correctness, assume incorrect
      // This is safer than assuming correct
      return false;
    }
    
    // Default fallback - if we can't determine correctness, assume incorrect
    console.warn(`🚨 [CORRECTNESS-CHECK] Could not determine correctness, defaulting to false`);
    return false;
  };

  useEffect(() => {
    fetchResults();
  }, []);



  // Enhanced helper function to get display score for a test result
  const getDisplayScore = (result: TestResult, useRecalculated: boolean = false) => {
    let displayScore = result.score || 0;
    
    // Enhanced adaptive test handling
    if (result.is_adaptive || result.test_type === 'adaptive') {
      console.log(`🎯 [ADAPTIVE-SCORE] Processing adaptive test score for attempt ${result.attempt_id}:`, {
        originalScore: result.score,
        testType: result.test_type,
        isAdaptive: result.is_adaptive,
        questionsAttempted: result.questions_attempted,
        totalPossibleQuestions: result.total_possible_questions
      });
      
      // First, normalize the score format
      if (displayScore !== null && displayScore !== undefined) {
        // If score is in 0-1 range, convert to percentage
        if (displayScore <= 1 && displayScore > 0) {
          displayScore = displayScore * 100;
          console.log(`🎯 [ADAPTIVE-SCORE] Converted 0-1 range to percentage: ${displayScore}%`);
        }
        // Handle edge cases where score might be > 100 (error case)
        else if (displayScore > 100) {
          console.warn(`🎯 [ADAPTIVE-SCORE] Score > 100% detected, capping at 100%: ${displayScore}`);
          displayScore = 100;
        }
      } else {
        console.warn(`🎯 [ADAPTIVE-SCORE] Invalid score detected, setting to 0`);
        displayScore = 0;
      }
      
      // Apply adaptive test score correction if we have the necessary metadata
      if (result.questions_attempted && result.total_possible_questions && 
          result.questions_attempted < result.total_possible_questions) {
        
        // Calculate what the correct answers would be based on the backend score
        const correctAnswersFromBackend = Math.round((displayScore / 100) * result.total_possible_questions);
        
        // Recalculate score based on attempted questions
        const recalculatedScore = result.questions_attempted > 0 ? 
          (correctAnswersFromBackend / result.questions_attempted) * 100 : 0;
        
        console.log(`🎯 [ADAPTIVE-RECALC] Recalculating score for attempt ${result.attempt_id}:`, {
          backendScore: displayScore,
          totalPossible: result.total_possible_questions,
          attempted: result.questions_attempted,
          calculatedCorrect: correctAnswersFromBackend,
          recalculatedScore: recalculatedScore
        });
        
        // Only apply the recalculation if it makes sense (score <= 100%)
        if (recalculatedScore <= 100) {
          displayScore = recalculatedScore;
          console.log(`🎯 [ADAPTIVE-RECALC] Applied recalculated score: ${displayScore}%`);
        }
      } else {
        // If we don't have metadata, apply a heuristic for common cases
        // Based on the analysis, many adaptive tests showing 50% might actually be perfect scores
        // that should show 100% (e.g., 2/2 correct showing as 2/4 = 50%)
        
        // Apply heuristic correction for likely cases
        if (displayScore === 50 && result.status === 'Completed') {
          console.log(`🎯 [ADAPTIVE-HEURISTIC] Detected 50% adaptive score, might need correction`);
          // For now, just log it - we can add more sophisticated heuristics later
          // displayScore = 100; // Uncomment if we want to correct all 50% scores
        }
        
        console.log(`🎯 [ADAPTIVE-SCORE] No metadata available for recalculation, using backend score: ${displayScore}%`);
      }
    } else {
      // Standard test handling (preserve existing logic)
      console.log(`📝 [STANDARD-SCORE] Processing standard test score for attempt ${result.attempt_id}:`, {
        originalScore: result.score,
        testType: result.test_type
      });
      
      // For standard tests, apply the existing normalization
      if (displayScore !== null && displayScore !== undefined) {
        if (displayScore <= 1 && displayScore > 0) {
          displayScore = displayScore * 100;
          console.log(`📝 [STANDARD-SCORE] Converted 0-1 range to percentage: ${displayScore}%`);
        }
      }
    }
    
    return {
      score: displayScore,
      displayText: `${displayScore.toFixed(2)}%`,
      isRecalculated: false
    };
  };
  
  const fetchResults = async () => {
    try {
      console.log('Fetching test results from API...');
      const response = await testsAPI.getAttempts();
      
      // Log raw data from API for debugging score issues
      console.log('Raw test results from API:', response.data);
      
      // Handle different API response formats
      let resultsData = Array.isArray(response.data) ? response.data : [];
      
      // If response.data is not an array but has results/data property
      if (!Array.isArray(response.data) && response.data?.results) {
        resultsData = response.data.results;
      } else if (!Array.isArray(response.data) && response.data?.data) {
        resultsData = response.data.data;
      }
      
      if (!Array.isArray(resultsData)) {
        console.warn('Results data is not an array:', resultsData);
        resultsData = [];
      }
      
      console.log(`Processing ${resultsData.length} test results`);
      
      // Check for format issues in scores and perform normalization
      const normalizedResults = resultsData.map((result: any) => {
        // Log raw score values for debugging
        console.log(`Test ID ${result.attempt_id} raw scores:`, {
          score: result.score,
          weighted_score: result.weighted_score,
          typeofScore: typeof result.score,
          typeofWeightedScore: typeof result.weighted_score,
          status: result.status
        });
        
        // Normalize scores to ensure consistent handling
        let normalizedScore = result.score;
        let normalizedWeightedScore = result.weighted_score;
        
        // Handle string values by converting to numbers
        if (typeof normalizedScore === 'string') {
          normalizedScore = parseFloat(normalizedScore);
          if (isNaN(normalizedScore)) normalizedScore = 0;
        }
        
        if (typeof normalizedWeightedScore === 'string') {
          normalizedWeightedScore = parseFloat(normalizedWeightedScore);
          if (isNaN(normalizedWeightedScore)) normalizedWeightedScore = 0;
        }
        
        // Handle null/undefined scores - only show scores for completed tests
        if (result.status !== 'Completed') {
          console.log(`Test ${result.attempt_id} is not completed (status: ${result.status}), setting scores to 0`);
          normalizedScore = 0;
          normalizedWeightedScore = 0;
        } else {
          // For completed tests, ensure we have valid scores
          if (normalizedScore === null || normalizedScore === undefined || isNaN(normalizedScore)) {
            console.warn(`Test ${result.attempt_id} completed but has invalid score, setting to 0`);
            normalizedScore = 0;
          }
          
          // Enhanced adaptive test score handling
          const isAdaptiveTest = result.is_adaptive || result.test_type === 'adaptive';
          
          if (isAdaptiveTest) {
            console.log(`🎯 [ADAPTIVE-NORMALIZE] Processing adaptive test ${result.attempt_id}`);
            
            // For adaptive tests, be more careful with score normalization
            if (normalizedScore !== null && normalizedScore !== undefined && normalizedScore > 0) {
              // Check if score is in 0-1 range and convert to percentage
              if (normalizedScore <= 1) {
                const originalScore = normalizedScore;
                normalizedScore = normalizedScore * 100;
                console.log(`🎯 [ADAPTIVE-NORMALIZE] Converted adaptive score from ${originalScore} to ${normalizedScore}%`);
              }
            }
            
            // Handle weighted score for adaptive tests
            if (normalizedWeightedScore !== null && normalizedWeightedScore !== undefined && normalizedWeightedScore > 0) {
              if (normalizedWeightedScore <= 1) {
                const originalWeightedScore = normalizedWeightedScore;
                normalizedWeightedScore = normalizedWeightedScore * 100;
                console.log(`🎯 [ADAPTIVE-NORMALIZE] Converted adaptive weighted_score from ${originalWeightedScore} to ${normalizedWeightedScore}%`);
              }
            } else if (normalizedScore > 0) {
              // For adaptive tests, if weighted_score is missing, use the normalized score
              normalizedWeightedScore = normalizedScore;
              console.log(`🎯 [ADAPTIVE-NORMALIZE] Set weighted_score equal to score for adaptive test: ${normalizedWeightedScore}%`);
            }
          } else {
            // Standard test handling (preserve existing logic)
            console.log(`📝 [STANDARD-NORMALIZE] Processing standard test ${result.attempt_id}`);
            
            // Handle cases where weighted_score is null/undefined but score exists
            if ((normalizedWeightedScore === null || normalizedWeightedScore === undefined || isNaN(normalizedWeightedScore)) && 
                normalizedScore !== null && normalizedScore !== undefined) {
              console.log(`Setting weighted_score equal to score for test ${result.attempt_id}`);
              normalizedWeightedScore = normalizedScore;
            }
            
            // Handle potential format mismatches for standard tests
            if (normalizedScore !== null && normalizedScore !== undefined && normalizedScore <= 1 && normalizedScore > 0) {
              console.log(`Converting score from 0-1 range to percentage for test ${result.attempt_id}`);
              normalizedScore = normalizedScore * 100;
            }
            
            if (normalizedWeightedScore !== null && normalizedWeightedScore !== undefined && normalizedWeightedScore <= 1 && normalizedWeightedScore > 0) {
              console.log(`Converting weighted_score from 0-1 range to percentage for test ${result.attempt_id}`);
              normalizedWeightedScore = normalizedWeightedScore * 100;
            }
          }
        }
        
        const normalizedResult = {
          ...result,
          score: normalizedScore,
          weighted_score: normalizedWeightedScore,
          // Ensure required fields have defaults
          test_type: result.test_type || 'Unknown',
          start_time: result.start_time || new Date().toISOString(),
          duration_minutes: result.duration_minutes || 0,
          total_allotted_duration_minutes: result.total_allotted_duration_minutes || 0,
          is_adaptive: result.is_adaptive || result.test_type === 'adaptive' || false
        };
        
        console.log(`✅ Normalized result for test ${result.attempt_id}:`, {
          originalScore: result.score,
          normalizedScore: normalizedResult.score,
          originalWeightedScore: result.weighted_score,
          normalizedWeightedScore: normalizedResult.weighted_score,
          isAdaptive: normalizedResult.is_adaptive,
          testType: normalizedResult.test_type
        });
        
        return normalizedResult;
      });
      
      console.log(`Successfully processed ${normalizedResults.length} test results`);
      setResults(normalizedResults);
      
      // Clear any existing error
      setError(null);
    } catch (err: any) {
      console.error('Error fetching test results:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load test results';
      setError(errorMessage);
      
      // Set empty results on error
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetails = async (attemptId: number) => {
    // Reset states before fetching new details
    setSelectedTest(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setShowDetails(true);
    
    // Find the corresponding test result
    const testResult = results.find(r => r.attempt_id === attemptId) || null;
    setSelectedTestResult(testResult);
    
    try {
      console.log(`Fetching details for attempt ID: ${attemptId}`);
      const response = await testsAPI.getAttemptDetails(attemptId);
      
      // Log the entire response structure for debugging
      console.log('Test details API response structure:', JSON.stringify(response.data, null, 2));
      
      // Add specific debug for adaptive tests
      const isAdaptiveAttempt = testResult?.is_adaptive || false;
      if (isAdaptiveAttempt) {
        console.log('🎯 [ADAPTIVE-DEBUG] Processing adaptive test details for attempt:', attemptId);
        console.log('🎯 [ADAPTIVE-DEBUG] Response data structure:', response.data);
      }
      
      // Handle different API response formats more robustly
      let responseData = response.data;
      
      // If response.data is nested under another data property
      if (responseData?.data && !responseData?.questions) {
        responseData = responseData.data;
      }
      
      // Attempt to find questions data in the response with flexible structure handling
      let questionsData = null;
      
      // Check for different possible structures
      if (responseData) {
        // Case 1: questions array directly at the top level
        if (responseData.questions && Array.isArray(responseData.questions)) {
          questionsData = responseData.questions;
          console.log('Found questions at top level:', questionsData.length);
        }
        // Case 2: questions might be nested under a 'data', 'attempt', 'result', or other property
        else if (responseData.data && responseData.data.questions && Array.isArray(responseData.data.questions)) {
          questionsData = responseData.data.questions;
          console.log('Found questions in nested data property:', questionsData.length);
        }
        // Case 3: questions might be under 'test_details', 'attempt_details', or similar
        else if (responseData.test_details && responseData.test_details.questions && 
                Array.isArray(responseData.test_details.questions)) {
          questionsData = responseData.test_details.questions;
          console.log('Found questions in test_details property:', questionsData.length);
        }
        // Case 4: questions might be an array of objects directly at the top level
        else if (Array.isArray(responseData) && responseData.length > 0 && 
                responseData[0] && (responseData[0].question_id || responseData[0].question_text)) {
          questionsData = responseData;
          console.log('Found questions as top level array:', questionsData.length);
        }
        // Case 5: attempt_details structure
        else if (responseData.attempt_details && Array.isArray(responseData.attempt_details)) {
          questionsData = responseData.attempt_details;
          console.log('Found questions in attempt_details array:', questionsData.length);
        }
        // Case 6: results structure (for some API formats)
        else if (responseData.results && Array.isArray(responseData.results)) {
          questionsData = responseData.results;
          console.log('Found questions in results array:', questionsData.length);
        }
        // Case 7: answers structure (might contain question info)
        else if (responseData.answers && Array.isArray(responseData.answers)) {
          questionsData = responseData.answers;
          console.log('Found questions in answers array:', questionsData.length);
        }
        // Case 8: check for any property that might contain an array of questions
        else {
          // Look through all top-level properties for arrays that might be questions
          for (const key in responseData) {
            if (Array.isArray(responseData[key]) && responseData[key].length > 0) {
              const firstItem = responseData[key][0];
              // Check if array items have properties typical of question objects
              if (firstItem && (firstItem.question_id !== undefined || 
                               firstItem.question_text !== undefined || 
                               firstItem.options !== undefined ||
                               firstItem.selected_option_index !== undefined ||
                               firstItem.correct_option_index !== undefined)) {
                questionsData = responseData[key];
                console.log(`Found possible questions array in property "${key}":`, questionsData.length);
                break;
              }
            }
          }
        }
      }

      if (questionsData && questionsData.length > 0) {
        // Log the options structure to debug display issues
        if (questionsData[0] && questionsData[0].options) {
          console.log('Sample option structure:', {
            firstQuestion: questionsData[0].question_text || questionsData[0].text || 'No text',
            optionsArray: questionsData[0].options,
            firstOption: questionsData[0].options[0]
          });
        }
        
        // Ensure each question has necessary properties to prevent errors
        const validatedQuestions = questionsData.map((q: any, index: number) => {
          // Extract and normalize selected and correct option indices for reuse
          const selectedOptionIndex = q.selected_option_index !== undefined ? q.selected_option_index : 
                                    q.selected_option !== undefined ? q.selected_option : 
                                    q.answer !== undefined ? q.answer : null;
                                    
          const correctOptionIndex = q.correct_option_index !== undefined ? q.correct_option_index : 
                                   q.correct_option !== undefined ? q.correct_option : 
                                   q.correct_answer !== undefined ? q.correct_answer : null;
          
          // Process options array with proper normalization
          let normalizedOptions: Array<any> = [];
          
          if (Array.isArray(q.options)) {
            // Log the raw options data
            console.log(`Question ${index + 1} raw options:`, q.options);
            
            // Map options to ensure they have required properties
            normalizedOptions = q.options.map((opt: any, optIndex: number) => {
              // Handle different option structures
              // 1. Standard format with option_id, option_text, option_order
              // 2. Minimal format with just text or value
              // 3. Array format [id, text, order]
              
              if (typeof opt === 'string') {
                // If option is just a string, create a proper structure
                return {
                  option_id: optIndex,
                  option_text: opt,
                  option_order: optIndex
                };
              } else if (Array.isArray(opt)) {
                // If option is an array, map it to expected structure
                return {
                  option_id: opt[0] || optIndex,
                  option_text: opt[1] || `Option ${optIndex + 1}`,
                  option_order: opt[2] !== undefined ? opt[2] : optIndex
                };
              } else {
                // Standard object format, ensure all properties exist
                // For adaptive tests, preserve original option_order to maintain randomization
                return {
                  option_id: opt.option_id !== undefined ? opt.option_id : 
                          opt.id !== undefined ? opt.id : optIndex,
                  option_text: opt.option_text || opt.text || opt.value || `Option ${optIndex + 1}`,
                  // Preserve original option_order if it exists, only fallback to optIndex if not present
                  option_order: opt.option_order !== undefined ? opt.option_order : 
                              opt.order !== undefined ? opt.order : optIndex
                };
              }
            });
            
            console.log(`Question ${index + 1} normalized options:`, normalizedOptions);
          } else if (q.choices && Array.isArray(q.choices)) {
            // Alternative "choices" field instead of "options"
            normalizedOptions = q.choices.map((choice: any, choiceIndex: number) => {
              return {
                option_id: choice.id !== undefined ? choice.id : choiceIndex,
                option_text: choice.text || choice.value || `Choice ${choiceIndex + 1}`,
                option_order: choice.order !== undefined ? choice.order : choiceIndex
              };
            });
            console.log(`Question ${index + 1} normalized from choices:`, normalizedOptions);
          }

          // Determine if the answer is correct using our helper function
          // Pass is_adaptive flag to ensure proper handling for adaptive tests
          const isAdaptiveTest = testResult?.is_adaptive || false;
          
          // Add detailed debug logging for adaptive tests
          if (isAdaptiveTest) {
            console.log(`🎯 [ADAPTIVE-DEBUG] Question ${index + 1} data:`, {
              question_id: q.question_id,
              has_marks: 'marks' in q,
              marks_value: q.marks,
              marks_type: typeof q.marks,
              has_is_correct: 'is_correct' in q,
              is_correct_value: q.is_correct,
              selected_option_index: selectedOptionIndex,
              correct_option_index: correctOptionIndex,
              all_fields: Object.keys(q)
            });
          }
          
          const isCorrect = determineIfCorrect(q, isAdaptiveTest);
          
          // Log detailed information about correctness determination and options
          console.log(`Question ${index + 1}: selected=${selectedOptionIndex}, correct=${correctOptionIndex}, isCorrect=${isCorrect}, optionsCount=${normalizedOptions.length}, isAdaptiveTest=${isAdaptiveTest}`);
          
          return {
            ...q,
            // Use normalized options array
            options: normalizedOptions,
            // Ensure other required properties have defaults
            question_text: q.question_text || q.text || 'Question text not available',
            question_id: q.question_id || q.id || `temp-id-${index}-${Math.random().toString(36).substring(2, 9)}`,
            selected_option_index: selectedOptionIndex,
            correct_option_index: correctOptionIndex,
            is_correct: isCorrect,
            explanation: q.explanation || q.feedback || ''
          };
        });

        // Extract user info with special handling for different data structures
        const extractedUserInfo = getUserInfo(responseData);
        
        // Always try to enhance user info with testResult data if available
        let enhancedUserInfo = { ...extractedUserInfo };
        
        if (testResult) {
          console.log('Enhancing user info with testResult data:', {
            extractedInfo: extractedUserInfo,
            testResultData: {
              user_name: testResult.user_name,
              candidate_name: testResult.candidate_name,
              user_id: testResult.user_id,
              candidate_id: testResult.candidate_id,
              email: testResult.email
            }
          });

          // Always try to use the best available data from both sources
          // Prioritize authenticated user data first, then testResult, then extracted info
          const userName = user ? `${user.first_name} ${user.last_name}` : 
                          testResult.user_name || testResult.candidate_name || extractedUserInfo.name;
          
          enhancedUserInfo = {
            ...enhancedUserInfo,
            name: userName,
            id: testResult.user_id || testResult.candidate_id || extractedUserInfo.id,
            email: testResult.email || extractedUserInfo.email
          };
          
          console.log('Enhanced user info with testResult data:', enhancedUserInfo);
        } else {
          console.log('No testResult data available for enhancing user info');
        }
        
        // Log complete data structures for debugging
        console.log('Final user info being set:', enhancedUserInfo);
        
        setSelectedTest({
          questions: validatedQuestions,
          is_adaptive: testResult?.is_adaptive || false,
          user_info: enhancedUserInfo,
          test_info: getTestInfo(responseData, testResult)
        });
      } else {
        // No questions found - this could be valid for some test states
        console.warn('No questions found in test details response');
        
        // Check if this is a valid test but just no questions returned
        if (testResult && testResult.status === 'Completed') {
          // Set basic test info even without questions
          setSelectedTest({
            questions: [],
            is_adaptive: testResult?.is_adaptive || false,
            user_info: getUserInfo(responseData),
            test_info: getTestInfo(responseData, testResult)
          });
          
          setDetailsError('Test completed but detailed question data is not available.');
        } else {
          // Detailed error logging
          console.error('Cannot find questions array in response structure:', responseData);
          setDetailsError('Unable to load test details. The test may not have been completed or data is not available.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load test details:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load test details. Please try again later.';
      setDetailsError(errorMessage);
    } finally {
      setDetailsLoading(false);
    }
  };
  const handleDownloadPdf = () => {
    if (!selectedTest) return;

    const doc = new jsPDF();
    const { title, category } = selectedTest.test_info || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { date } = selectedTest.test_info || {};
    const userName = selectedTest.user_info?.name || 'N/A';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userEmail = selectedTest.user_info?.email || 'N/A';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userId = selectedTest.user_info?.id || 'N/A';
    
    // Initialize lastY for vertical positioning throughout the document
    let lastY = 0;

    // Set document properties
    doc.setProperties({
      title: `Test Results - ${title || 'Assessment'}`,
      subject: 'Test Results Report',
      author: 'CIL HR Examination System',
      keywords: 'test, results, assessment',
      creator: 'CIL HR Examination System'
    });    // Header
    try {
      doc.setFontSize(20).setTextColor(0, 102, 204).text('Test Results Report', 14, 22);
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      console.error('Error setting text for header:', error);
    }
    
    // User Info Box
    doc.setFillColor(240, 240, 240);
    try {
      // Make sure all parameters are correct and valid numbers
      if (typeof 14 === 'number' && typeof 30 === 'number' && 
          typeof 182 === 'number' && typeof 40 === 'number') {
        doc.rect(14, 30, 182, 40, 'F');
      } else {
        throw new Error('Invalid rect parameters');
      }
    } catch (error) {
      console.error('Error drawing rectangle in PDF:', error);
      // Fallback if the rect method fails
      try {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.1);
        doc.line(14, 30, 196, 30); // Top line
        doc.line(14, 70, 196, 70); // Bottom line
        doc.line(14, 30, 14, 70);  // Left line
        doc.line(196, 30, 196, 70); // Right line
      } catch (lineError) {
        console.error('Error drawing fallback lines:', lineError);
      }
    }
    
    try {
      doc.setFontSize(12).setFont('helvetica', 'bold').text('User Information', 16, 38);
      doc.setFont('helvetica', 'normal').text(`Name: ${userName}`, 16, 46);
    } catch (textError) {
      console.error('Error setting text for user info:', textError);
    }      // Test Info Box
    try {
      doc.setFillColor(240, 240, 240);
    } catch (error) {
      console.error('Error setting fill color:', error);
    }
    
    try {
      // Make sure all parameters are correct and valid numbers
      if (typeof 14 === 'number' && typeof 75 === 'number' && 
          typeof 182 === 'number' && typeof 40 === 'number') {
        doc.rect(14, 75, 182, 40, 'F');
      } else {
        throw new Error('Invalid rect parameters');
      }
    } catch (error) {
      console.error('Error drawing test info rectangle in PDF:', error);
      // Fallback if the rect method fails
      try {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.1);
        doc.line(14, 75, 196, 75);   // Top line
        doc.line(14, 115, 196, 115); // Bottom line
        doc.line(14, 75, 14, 115);   // Left line
        doc.line(196, 75, 196, 115); // Right line
      } catch (lineError) {
        console.error('Error drawing fallback lines:', lineError);
      }
    }      try {
      doc.setFontSize(12).setFont('helvetica', 'bold').text('Test Information', 16, 83);
      doc.setFont('helvetica', 'normal').text(`Title: ${title || 'N/A'}`, 16, 91);
      doc.text(`Category: ${category || 'N/A'}`, 16, 99);
      doc.text(`Date: ${new Date(selectedTest.start_time || Date.now()).toLocaleString()}`, 16, 107);
      
      // Extract Test ID and Test Time from test_info
      const testId = selectedTest.test_info?.id || 'N/A';
      const testTime = selectedTest.test_info?.test_time || 'N/A';
        // Add Test ID and Test Time to the PDF
      doc.text(`Test ID: ${testId}`, 16, 115);
      doc.text(`Test Time: ${testTime}`, 16, 123);
      
      // Update lastY to point to end of Test Information section
      lastY = 135; // Position after Test Time with some padding
    } catch (textError) {
      console.error('Error setting text for test info:', textError);
    }      // Add adaptive test badge if applicable
    if (selectedTest.is_adaptive) {
      try {
        doc.setFillColor(0, 102, 204);
      } catch (error) {
        console.error('Error setting fill color for adaptive badge:', error);
      }
      
      try {
        // Make sure all parameters are correct and valid numbers
        if (typeof 140 === 'number' && typeof 75 === 'number' && 
            typeof 50 === 'number' && typeof 10 === 'number') {
          doc.rect(140, 75, 50, 10, 'F');
        } else {
          throw new Error('Invalid rect parameters for adaptive badge');
        }
      } catch (error) {
        console.error('Error drawing adaptive test badge in PDF:', error);
        // Fallback to a different visual style if rect fails
        try {
          doc.setDrawColor(0, 102, 204);
          doc.setLineWidth(1);
          doc.line(140, 75, 190, 75);   // Top line
          doc.line(140, 85, 190, 85);   // Bottom line 
          doc.line(140, 75, 140, 85);   // Left line
          doc.line(190, 75, 190, 85);   // Right line
        } catch (lineError) {
          console.error('Error drawing fallback lines for adaptive badge:', lineError);
        }
      }
      
      try {
        doc.setTextColor(255, 255, 255).setFontSize(8);
        doc.text('ADAPTIVE TEST', 165, 82, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      } catch (textError) {
        console.error('Error setting text for adaptive badge:', textError);      }
    }
    
    // Table - Summary (now using lastY for proper positioning)
    doc.setFontSize(14).setFont('helvetica', 'bold').text('Test Summary', 14, lastY);
    doc.setFont('helvetica', 'normal');
    
    // Update lastY for content that follows
    lastY += 10;
    
    // Handle adaptive tests by filtering only attempted questions for both display and scoring
    let validQuestions = selectedTest.questions;
    let displayQuestionsInfo = '';
    
    if (selectedTest.is_adaptive) {
      console.log('Processing adaptive test questions for summary');
      const totalQuestions = selectedTest.questions.length;
      
      // Filter only attempted questions (those with a selected option or marks > 0)
      validQuestions = selectedTest.questions.filter(q => {
        // Check for any indication that the question was attempted
        const hasSelection = (q.selected_option_index !== undefined && q.selected_option_index !== null) || 
                          ((q as any).selected_option !== undefined && (q as any).selected_option !== null) || 
                          ((q as any).answer !== undefined && (q as any).answer !== null);
        
        // Also check for positive marks as indication of attempt
        const hasMarks = q.marks !== undefined && q.marks !== null && (
          (typeof q.marks === 'number' && q.marks > 0) ||
          (typeof q.marks === 'string' && parseFloat(q.marks) > 0) ||
          (typeof q.marks === 'boolean' && q.marks === true)
        );
        
        return hasSelection || hasMarks;
      });
      
      const attemptedCount = validQuestions.length;
      displayQuestionsInfo = `Attempted ${attemptedCount} out of ${totalQuestions} questions`;
      
      console.log(`Filtered ${attemptedCount} attempted questions out of ${totalQuestions} total questions`);
    }

    // Calculate score safely, using only attempted questions for adaptive tests
    const totalQuestions = validQuestions.length; // Use actual attempted questions for both adaptive and standard tests
      
    // Re-apply determineIfCorrect with adaptive test flag for consistency
    const correctAnswers = validQuestions.filter(q => 
      selectedTest.is_adaptive ? 
        determineIfCorrect(q, true) : // Re-check with adaptive flag
        q.is_correct // Use existing calculation for regular tests
    ).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const scorePercent = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : '0.00';
    
    // For adaptive tests, also calculate the "correct" score based on attempted questions
    let displayScoreText = `${scorePercent}%`;
    if (selectedTest.is_adaptive) {
      const correctScore = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : '0.00';
      displayScoreText = `${correctScore}% (${correctAnswers}/${totalQuestions} attempted)`;
      console.log(`Adaptive test score recalculated: ${correctScore}% (${correctAnswers} correct out of ${totalQuestions} attempted)`);
    }
    
    // Log the calculation for debugging
    console.log('Test summary statistics:', {
      total: totalQuestions,
      correct: correctAnswers,
      incorrect: incorrectAnswers,
      correctPercent: parseFloat(scorePercent),
      isAdaptive: selectedTest.is_adaptive,
      displayInfo: displayQuestionsInfo || 'Standard test'
    });
      try {
      doc.autoTable({
        startY: 130,
        head: [['Total Questions', 'Correct Answers', 'Incorrect Answers', 'Score']],
        body: [[
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          displayScoreText
        ]],
        theme: 'grid',
        styles: { cellPadding: 4, fontSize: 10 },
        headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
    } catch (error) {
      console.error('Error generating summary table in PDF:', error);
      // Fallback - draw a simple summary text if table fails
      doc.setFontSize(11);
      doc.text(`Total Questions: ${totalQuestions}`, 14, 140);
      doc.text(`Correct Answers: ${correctAnswers}`, 14, 150);
      doc.text(`Incorrect Answers: ${incorrectAnswers}`, 14, 160);
      doc.text(`Score: ${displayScoreText}`, 14, 170);    }    // Table - Questions with options    // Track the Y position after the summary table
    try {
      // Get the Y position after the summary table
      if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
        lastY = (doc as any).lastAutoTable.finalY + 15;
        console.log('Updated lastY position after summary table:', lastY);
      } else {
        lastY = 145;
        console.log('Using default lastY position:', lastY);
      }
    } catch (error) {
      console.error('Error accessing lastAutoTable in PDF:', error);
      // Keep default value of 145 if there's an error
      lastY = 145;
    }
    doc.setFontSize(14).setFont('helvetica', 'bold').text('Questions & Answers', 14, lastY);
    doc.setFont('helvetica', 'normal');
    lastY += 7;    // Define interfaces for PDF table structure
    interface QuestionTableCellStyle {
      fillColor?: number[];
      textColor?: number | number[];
      fontStyle?: string;
      cellPadding?: number;
      fontSize?: number;
      cellWidth?: number | string;
    }

    interface QuestionTableCell {
      content: string;
      colSpan?: number;
      styles: QuestionTableCellStyle;
    }

    interface QuestionTableData {
      head: QuestionTableCell[][];
      body: QuestionTableCell[][];
    }    // Prepare all questions data to ensure proper pagination
    const prepareAllQuestionsData = (): QuestionTableData[] => {
      // Create a master array to hold all questions data with proper typing
      const allQuestionsTables: QuestionTableData[] = [];

      // Process each question - using validQuestions for proper filtering in adaptive tests
      validQuestions.forEach((q, index) => {
        // Question header
        const tableData = [];
        const questionHeader = [{
          content: `Question ${index + 1}${q.is_correct ? ' ✓' : ' ✗'}`,
          colSpan: 2,
          styles: {
            fillColor: q.is_correct ? [76, 175, 80] : [244, 67, 54],
            textColor: 255,
            fontStyle: 'bold'
          }
        }];

        // Question text
        tableData.push([{
          content: q.question_text,
          colSpan: 2,
          styles: { fillColor: [240, 240, 240] }
        }]);

        // Options
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          q.options.forEach((option, optIndex) => {
            // More flexible comparison that checks both option_id and option_order
            const isSelected = 
              q.selected_option_index === option.option_id || 
              q.selected_option_index === option.option_order ||
              q.selected_option_index === optIndex;
              
            const isCorrect = 
              q.correct_option_index === option.option_id || 
              q.correct_option_index === option.option_order ||
              q.correct_option_index === optIndex;
              
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const isWrongSelection = isSelected && !isCorrect;

            tableData.push([
              {
                content: `${String.fromCharCode(65 + option.option_order)}`,
                styles: {
                  fontStyle: (isSelected || isCorrect) ? 'bold' : 'normal',
                  fillColor: isCorrect ? [220, 237, 200] : isSelected && !isCorrect ? [255, 235, 235] : [255, 255, 255],
                  textColor: isCorrect ? [0, 128, 0] : isSelected && !isCorrect ? [220, 0, 0] : [0, 0, 0]
                }
              },
              {
                content: `${option.option_text}${isSelected ? ' (Your Answer)' : ''}${isCorrect ? ' (Correct)' : ''}`,
                styles: {
                  fontStyle: (isSelected || isCorrect) ? 'bold' : 'normal',
                  fillColor: isCorrect ? [220, 237, 200] : isSelected && !isCorrect ? [255, 235, 235] : [255, 255, 255],
                  textColor: isCorrect ? [0, 128, 0] : isSelected && !isCorrect ? [220, 0, 0] : [0, 0, 0]
                }
              }
            ]);
          });
        } else {
          tableData.push([{
            content: 'No options available for this question',
            colSpan: 2,
            styles: { textColor: [150, 150, 150] }
          }]);
        }

        // Add explanation if incorrect
        if (!q.is_correct && q.explanation) {
          tableData.push([{
            content: `Explanation: ${q.explanation}`,
            colSpan: 2,
            styles: { fontStyle: 'italic', textColor: [100, 100, 100] }
          }]);
        }

        // Store the question data
        allQuestionsTables.push({
          head: [questionHeader],
          body: tableData
        });
      });

      return allQuestionsTables;
    };

    // Get all question tables prepared for rendering
    const allQuestionsTables = prepareAllQuestionsData();
    console.log(`Prepared ${allQuestionsTables.length} questions for PDF rendering`);
    
    // Render each question with proper pagination
    for (let i = 0; i < allQuestionsTables.length; i++) {
      const questionData = allQuestionsTables[i];
        // Check if we need a page break BEFORE rendering the question
      // This ensures we don't start a question at the bottom of a page
      
      // Lower the threshold to ensure we don't run out of space
      if (lastY > 210 && i < allQuestionsTables.length - 1) {
        console.log(`Adding page break before question ${i+1}, lastY position: ${lastY}`);
        doc.addPage();
        lastY = 20; // Reset Y position for new page
      }
      
      // Force a page break every 3 questions to ensure pagination works
      if (i > 0 && i % 3 === 0 && i < allQuestionsTables.length - 1) {
        console.log(`Forcing page break after every 3 questions, current question: ${i+1}`);
        doc.addPage();
        lastY = 20; // Reset Y position for new page
      }
        // Draw the question table and get its position
      let tableResult;
      try {
        // Use the autoTable function directly on the doc object
        doc.autoTable({
          startY: lastY,
          head: questionData.head,
          body: questionData.body,
          theme: 'grid',
          styles: { cellPadding: 3, fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' }
          },
          didDrawPage: function () {
            try {
              // Header on each page
              doc.setFontSize(10).setTextColor(100);
              doc.text(`Test Results: ${userName} - ${title || 'Assessment'}`, 14, 10);
            } catch (error) {
              console.error('Error in didDrawPage:', error);
            }
          },
          // Don't overflow cells to new pages, add a new page as needed
          willDrawCell: function(data: any) {
            // If a cell is too tall for the current page, autoTable will
            // automatically add a new page
            return true;
          }
        });
        
        // Get the last table information
        tableResult = {
          finalY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : lastY + 40
        };
      } catch (error) {
        console.error(`Error generating question ${i+1} table in PDF:`, error);
          // Fallback - draw simple text for the question
        try {
          doc.setFontSize(10);
          const currentQuestion = validQuestions[i];
          const shortQuestionText = currentQuestion.question_text.length > 50 ? 
            currentQuestion.question_text.substring(0, 50) + "..." : 
            currentQuestion.question_text;
          
          // Be extra careful with text positioning
          try {
            doc.text(`Question ${i + 1}`, 14, lastY + 10);
          } catch (e) {
            console.error('Error drawing question number:', e);
          }
          
          try {
            doc.text(`${shortQuestionText}`, 14, lastY + 20); 
          } catch (e) {
            console.error('Error drawing question text:', e);
          }
          
          try {
            doc.text(`Answer: ${currentQuestion.is_correct ? 'Correct' : 'Incorrect'}`, 14, lastY + 30);
          } catch (e) {
            console.error('Error drawing answer text:', e);
          }
        } catch (textError) {
          console.error('Error in fallback text drawing:', textError);
        }
        
        // Set a default position for lastY update
        tableResult = { finalY: lastY + 40 };
      }      // Update lastY for the next question
      // Use lastAutoTable property for consistent Y tracking
      try {
        if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
          lastY = (doc as any).lastAutoTable.finalY + 10;
        } else {
          lastY = tableResult.finalY + 10;
        }
        console.log(`Question ${i+1} finalY position: ${lastY}`);
      } catch (error) {
        console.error('Error updating lastY position:', error);
        lastY = tableResult.finalY + 10;
      }
    }

    // Add footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Add footer with page numbers
      doc.setFontSize(10).setTextColor(100);
      doc.text(`Page ${i} of ${totalPages}`, 196, 285, { align: 'right' });

      // Add a line above the footer
      doc.setDrawColor(200);
      doc.line(14, 280, 196, 280);

      // Add footer text with date and time
      const currentDate = new Date().toLocaleString();
      doc.setFontSize(8);
      doc.text(`Generated on: ${currentDate}`, 14, 285);
      doc.text('CIL HR Examination System', 105, 285, { align: 'center' });
    }

    // Save the PDF with formatted filename
    const formattedDate = new Date().toISOString().slice(0, 10);
    const formattedUserName = userName.replace(/\s+/g, '_').toLowerCase();
    doc.save(`test_results_${formattedUserName}_${formattedDate}.pdf`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Results
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Test Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Raw Score</TableCell>
              <TableCell>Final Score</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.attempt_id}>
                <TableCell>
                  {result.test_type}
                  {result.is_adaptive && (
                    <Typography 
                      variant="caption" 
                      color="primary"
                      sx={{ display: 'block', fontWeight: 'bold' }}
                    >
                      Adaptive
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(result.start_time).toLocaleDateString()}
                </TableCell>                <TableCell>
                  {result.duration_minutes || 0} / {result.total_allotted_duration_minutes || 0} minutes
                </TableCell>                <TableCell>
                  {(() => {
                    const displayScore = getDisplayScore(result);
                    console.log(`🖥️ [TABLE-RENDER] Rendering Raw Score cell for Test ${result.attempt_id}:`, {
                      displayScore,
                      isAdaptive: result.is_adaptive,
                      backendScore: result.score
                    });
                    return (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color={displayScore.score >= 60 ? 'success.main' : 'error.main'}
                        >
                          {displayScore.displayText}
                        </Typography>
                        {result.is_adaptive && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'block', 
                              fontSize: '0.7rem',
                              fontStyle: 'italic'
                            }}
                          >
                            Click "View Details" for accurate adaptive score
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    // For Final Score, use weighted_score if available, otherwise use the same as raw score
                    const displayScore = getDisplayScore(result);
                    const finalScore = result.weighted_score !== null && result.weighted_score !== undefined ? 
                      result.weighted_score : displayScore.score;
                    
                    console.log(`🖥️ [TABLE-RENDER] Rendering Final Score cell for Test ${result.attempt_id}:`, {
                      displayScore,
                      finalScore,
                      weightedScore: result.weighted_score,
                      isAdaptive: result.is_adaptive
                    });
                    
                    return (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color={finalScore >= 60 ? 'success.main' : 'error.main'}
                        >
                          {`${finalScore.toFixed(2)}%`}
                        </Typography>
                        {result.is_adaptive && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'block', 
                              fontSize: '0.7rem',
                              fontStyle: 'italic'
                            }}
                          >
                            See details for attempted-based score
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleViewDetails(result.attempt_id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {results.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            You haven't taken any tests yet.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/tests/mock')}
          >
            Take a Mock Test
          </Button>
        </Box>
      )}      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 2,
            boxShadow: 10,
            background: theme => theme.palette.mode === 'dark' 
              ? 'linear-gradient(to bottom, #272727, #1f1f1f)' 
              : 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
            overflowY: 'auto'
          }
        }}
      >        <DialogTitle sx={{ 
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0,
          p: 2.5,
          boxShadow: theme => theme.palette.mode === 'dark' ? 'none' : 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>            <Box
              sx={{
                display: 'inline-flex',
                mr: 2,
                backgroundColor: theme => theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 0.5
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>📋</span>
            </Box>
            <Typography variant="h6">Test Details</Typography>
          </Box>
          <Button 
            variant="contained" 
            color="secondary" 
            size="small" 
            onClick={() => handleDownloadPdf()}
            startIcon={<span>📄</span>}
            sx={{ 
              ml: 2,
              boxShadow: 2,
              ':hover': {
                boxShadow: 4,
                backgroundColor: 'secondary.dark'
              },
              transition: 'all 0.2s'
            }}
          >
            Download PDF
          </Button>
        </DialogTitle>        <DialogContent sx={{ 
          px: 3, 
          py: 4,
          bgcolor: 'background.paper',
          color: 'text.primary'
        }}>
          {detailsLoading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography>Loading test details...</Typography>
            </Box>
          )}
          
          {detailsError && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {detailsError}
              </Alert>
              <Button 
                variant="outlined" 
                onClick={() => setDetailsError(null)}
                sx={{ mt: 2 }}
              >
                Dismiss
              </Button>
            </Box>
          )}
          
          {!detailsLoading && !detailsError && selectedTest && (
            <Box>
              {/* Adaptive Test Notice Banner */}
              {(selectedTest.is_adaptive || selectedTestResult?.is_adaptive) && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    fontWeight: 'medium'
                  }}
                  icon={<span style={{ fontSize: '1.2rem' }}>🎯</span>}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Adaptive Test Scoring
                    </Typography>
                    <Typography variant="body2">
                      This score is calculated based on <strong>attempted questions only</strong> (not total possible questions), 
                      providing an accurate reflection of your performance on the questions you answered.
                    </Typography>
                  </Box>
                </Alert>
              )}
              
              {/* User information */}              <Paper 
                sx={(theme) => ({ 
                  p: 3, 
                  mb: 4, 
                  borderRadius: 2,
                  boxShadow: theme.palette.mode === 'dark' ? 1 : 3,
                  backgroundImage: theme.palette.mode === 'dark'
                    ? 'linear-gradient(to right, #303030, #242424)'
                    : 'linear-gradient(to right, #f8f9fa, #f1f3f5)',
                  borderLeft: '5px solid',
                  borderLeftColor: 'primary.main'
                })}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      pb: 1,
                      mb: 2,
                      borderBottom: '2px solid',
                      borderBottomColor: 'primary.light'
                    }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'primary.main', 
                          mr: 1.5,
                          width: 32,
                          height: 32
                        }}
                      >
                        {selectedTest.user_info?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>                      <Typography 
                        variant="h6" 
                        sx={(theme) => ({ 
                          color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.dark',
                          fontWeight: 'bold'
                        })}
                      >
                        User Information
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 1 }}>
                      <Typography sx={{ mb: 1, display: 'flex' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 60 }}>Name:</Box> 
                        <Box component="span" sx={{ ml: 1 }}>{selectedTest.user_info?.name || 'N/A'}</Box>
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      pb: 1,
                      mb: 2,
                      borderBottom: '2px solid',
                      borderBottomColor: 'secondary.light'
                    }}>
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'secondary.main', 
                          color: 'white',
                          mr: 1.5,
                          borderRadius: '50%',
                          width: 32,
                          height: 32
                        }}
                      >
                        📝
                      </Box>                      <Typography 
                        variant="h6" 
                        sx={(theme) => ({ 
                          color: theme.palette.mode === 'dark' ? 'secondary.light' : 'secondary.dark',
                          fontWeight: 'bold'
                        })}
                      >
                        Test Information
                      </Typography>
                    </Box>
                    
                    <Box sx={{ pl: 1 }}>
                      <Typography sx={{ mb: 1, display: 'flex' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 75 }}>Title:</Box>
                        <Box component="span" sx={{ ml: 1 }}>{selectedTest.test_info?.title || 'N/A'}</Box>
                      </Typography>                      <Box sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 75 }}>Category:</Box>
                        <Box sx={{ ml: 1, display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {selectedTest.is_adaptive && (
                              <Chip 
                                size="small" 
                                label="Adaptive" 
                                color="primary" 
                                sx={{ mr: 1, fontWeight: 'bold' }} 
                              />
                            )}
                            <Box component="span">
                              {selectedTest.test_info?.category || 'N/A'}
                            </Box>
                          </Box>
                            {selectedTest.is_adaptive && (
                            <Box sx={{ display: 'block', mt: 1 }}>
                              <Box
                                component="span"
                                sx={{ 
                                  color: 'text.secondary',
                                  fontStyle: 'italic',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Only attempted questions are shown ({
                                  // First try API-provided count, then fall back to filtered count
                                  selectedTest.questions_attempted !== undefined ? 
                                  selectedTest.questions_attempted : 
                                  selectedTest.questions.filter(q => 
                                    (q.selected_option_index !== undefined && q.selected_option_index !== null) || 
                                    ((q as any).selected_option !== undefined && (q as any).selected_option !== null) || 
                                    ((q as any).answer !== undefined && (q as any).answer !== null)
                                  ).length
                                } of {
                                  // First try API-provided total if available, otherwise fall back
                                  selectedTest.total_possible_questions !== undefined ? 
                                  selectedTest.total_possible_questions : 
                                  selectedTestResult?.total_possible_questions !== undefined ?
                                  selectedTestResult.total_possible_questions :
                                  selectedTest.questions_attempted !== undefined ?
                                  selectedTest.questions_attempted :
                                  selectedTest.questions.filter(q => 
                                    (q.selected_option_index !== undefined && q.selected_option_index !== null)
                                  ).length
                                } total)
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>                      <Typography sx={{ mb: 1, display: 'flex' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 75 }}>Date:</Box>
                        <Box component="span" sx={{ ml: 1 }}>{new Date(selectedTest.start_time ?? '').toLocaleString() || 'N/A'}</Box>
                      </Typography>                      <Typography sx={{ mb: 1, display: 'flex' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 75 }}>Test ID:</Box>
                        <Box component="span" sx={{ ml: 1 }}>{selectedTest.test_info?.id || 'N/A'}</Box>
                      </Typography>
                      <Typography sx={{ mb: 1, display: 'flex' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', width: 75 }}>Test Time:</Box>
                        <Box component="span" sx={{ ml: 1 }}>{selectedTest.test_info?.test_time || 'N/A'}</Box>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
                {/* Summary statistics */}              <Paper 
                sx={(theme) => ({ 
                  p: 3, 
                  mb: 4, 
                  borderRadius: 2,
                  boxShadow: theme.palette.mode === 'dark' ? 1 : 3,
                  backgroundImage: theme.palette.mode === 'dark'
                    ? 'linear-gradient(to right, #303030, #252836)'
                    : 'linear-gradient(to right, #f8f9fa, #edf2ff)',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                  position: 'relative',
                  overflow: 'hidden'
                })}
              >
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '150px',
                  height: '150px',
                  backgroundColor: 'rgba(66, 99, 235, 0.05)',
                  transform: 'rotate(45deg) translate(60px, -60px)',
                  zIndex: 0
                }} />
                  <Box sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  pb: 1,
                  mb: 2,
                  borderBottom: '2px solid',
                  borderBottomColor: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.info.main, 0.5)
                    : theme.palette.info.light,
                  position: 'relative',
                  zIndex: 1
                })}>
                  <Box 
                    sx={(theme) => ({ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.info.main, 0.8)
                        : theme.palette.info.main,
                      color: 'white',
                      mr: 1.5,
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      boxShadow: theme.palette.mode === 'dark' 
                        ? `0 0 10px ${alpha(theme.palette.info.main, 0.3)}`
                        : 'none'
                    })}
                  >
                    📊
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={(theme) => ({ 
                      color: theme.palette.mode === 'dark' 
                        ? theme.palette.info.light
                        : theme.palette.info.dark,
                      fontWeight: 'bold'
                    })}
                  >
                    Test Summary
                  </Typography>
                </Box>
                  {/* Calculate correct/incorrect counts with robust error handling */}
                {(() => {
                  try {
                    // Check if questions array exists and is valid
                    if (!selectedTest.questions || !Array.isArray(selectedTest.questions)) {
                      return (
                        <Box>
                          <Typography color="error">
                            Error: Unable to display statistics. Question data is missing or invalid.
                          </Typography>
                        </Box>
                      );
                    }

                    // Get filtered questions for adaptive tests
                    // For adaptive tests, we need to ensure we only count questions that were actually attempted
                    let validQuestions = selectedTest.questions;                      if (selectedTest.is_adaptive) {
                      console.log('Processing adaptive test questions for summary');
                      // Filter only attempted questions (those with a selected option)                      
                      validQuestions = selectedTest.questions.filter(q => {
                        // For adaptive tests, we consider a question attempted ONLY if it has a non-null selected_option_index
                        // This is the most reliable indicator that a user actually answered the question
                        return q.selected_option_index !== null && q.selected_option_index !== undefined;
                      });
                      
                      // For total questions count, use API-provided values if available
                      const attemptedQuestionsCount = selectedTest.questions_attempted !== undefined ?
                        selectedTest.questions_attempted : validQuestions.length;
                        
                      const totalQuestionsCount = selectedTest.total_possible_questions !== undefined ? 
                        selectedTest.total_possible_questions : 
                        selectedTestResult?.total_possible_questions !== undefined ?
                        selectedTestResult.total_possible_questions :
                        selectedTest.questions_attempted !== undefined ?
                        selectedTest.questions_attempted :
                        validQuestions.length;
                        
                      console.log(`Filtered ${attemptedQuestionsCount} attempted questions out of ${totalQuestionsCount} total questions`);
                    }
                    
                    const total = validQuestions.length;
                    // Re-apply determineIfCorrect with adaptive test flag for consistency
                    const correct = validQuestions.filter(q => 
                      selectedTest.is_adaptive ? 
                        determineIfCorrect(q, true) : // Re-check with adaptive flag
                        q.is_correct // Use existing calculation for regular tests
                    ).length;
                    
                    const incorrect = total - correct;
                    
                    // For adaptive tests, calculate score as (correct/attempted), not (correct/total)
                    let correctPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    let scoreDisplayText = `${correctPercent}%`;
                    
                    if (selectedTest.is_adaptive) {
                      // Recalculate score for adaptive tests as (correct/attempted)
                      correctPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
                      scoreDisplayText = `${correctPercent}% (${correct}/${total} attempted)`;
                      console.log(`Adaptive test dialog score: ${correctPercent}% (${correct} correct out of ${total} attempted)`);
                    }
                    
                    // Detailed logging of summary statistics
                    console.log('Test summary statistics:', { 
                      total, 
                      correct, 
                      incorrect, 
                      correctPercent,
                      isAdaptive: selectedTest.is_adaptive,
                      validQuestionsCount: validQuestions.length,
                      totalQuestionsCount: selectedTest.questions.length,
                      questions: validQuestions.map(q => ({ 
                        id: q.question_id,
                        is_correct: q.is_correct,
                        selected: q.selected_option_index,
                        correct: q.correct_option_index
                      }))
                    });
                      // Calculate score class based on percentage
                    const getScoreClass = (percent: number) => {
                      if (percent >= 80) return 'success';
                      if (percent >= 60) return 'info';
                      if (percent >= 40) return 'warning';
                      return 'error';
                    };
                    
                    const scoreClass = getScoreClass(correctPercent);
                    
                    return (
                      <Box sx={{ position: 'relative', zIndex: 1 }}>                        {/* Score circle */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          mb: 3,
                          mt: 2
                        }}>
                          <Box sx={(theme) => ({
                            position: 'relative',
                            width: 140,
                            height: 140,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '10px solid',
                            borderColor: `${scoreClass}.light`,
                            boxShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(0,0,0,0.5)' : 3,
                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              width: '100%',
                              height: `${correctPercent}%`,
                              backgroundColor: `${scoreClass}.light`,
                              opacity: theme.palette.mode === 'dark' ? 0.4 : 0.3,
                              transition: 'height 1s ease-out'
                            }
                          })}>                            <Typography 
                              variant="h3" 
                              fontWeight="bold" 
                              color={`${scoreClass}.main`}
                              sx={(theme) => ({ 
                                textShadow: theme.palette.mode === 'dark' 
                                  ? '1px 1px 1px rgba(0,0,0,0.3)' 
                                  : '1px 1px 1px rgba(0,0,0,0.1)',
                                zIndex: 1,
                              })}
                            >
                              {correctPercent}%
                            </Typography>
                            {selectedTest.is_adaptive && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  mt: 0.5, 
                                  fontWeight: 'medium',
                                  textAlign: 'center',
                                  zIndex: 1,
                                  fontSize: '0.7rem'
                                }}
                              >
                                ({correct}/{total} attempted)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        
                        {/* Statistics grid */}
                        <Grid container spacing={2} sx={{ mt: 1 }}>                          <Grid item xs={6}>
                            <Paper
                              elevation={2}
                              sx={(theme) => ({
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : '#f8f9fa',
                                border: theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
                              })}
                            >
                              <Typography variant="body2" color="text.secondary">
                                Total Questions
                              </Typography>
                              <Typography variant="h4" fontWeight="bold" color="text.primary">
                                {total}
                              </Typography>
                            </Paper>
                          </Grid>
                            <Grid item xs={6}>
                            <Paper
                              elevation={2}
                              sx={(theme) => ({
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? alpha(theme.palette.success.dark, 0.7)
                                  : theme.palette.success.light,
                                color: 'white',
                                boxShadow: theme.palette.mode === 'dark'
                                  ? `0 0 10px ${alpha(theme.palette.success.dark, 0.3)}`
                                  : 2
                              })}
                            >
                              <Typography variant="body2" color="white">
                                Correct Answers
                              </Typography>
                              <Typography variant="h4" fontWeight="bold">
                                {correct}
                              </Typography>
                            </Paper>
                          </Grid>
                            <Grid item xs={12}>
                            <Paper
                              elevation={2}
                              sx={(theme) => ({
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? alpha(theme.palette.error.dark, 0.7)
                                  : theme.palette.error.light,
                                color: 'white',
                                boxShadow: theme.palette.mode === 'dark'
                                  ? `0 0 10px ${alpha(theme.palette.error.dark, 0.3)}`
                                  : 2
                              })}
                            >
                              <Typography variant="body2" color="white">
                                Incorrect Answers
                              </Typography>
                              <Typography variant="h4" fontWeight="bold">
                                {incorrect}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  } catch (error) {
                    console.error('Error calculating test statistics:', error);
                    return (
                      <Box>
                        <Typography color="error">
                          Error: Unable to calculate statistics. Please try again later.
                        </Typography>
                      </Box>
                    );
                  }
                })()}
              </Paper>              {/* Questions header */}              <Box sx={(theme) => ({ 
                display: 'flex',
                alignItems: 'center',
                pb: 1,
                mb: 3,
                pl: 2,
                borderBottom: '2px solid',
                borderBottomColor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.grey[500], 0.3)
                  : theme.palette.grey[300],
                position: 'relative'
              })}>
                <Typography 
                  variant="h6" 
                  sx={(theme) => ({ 
                    color: theme.palette.text.primary,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center'
                  })}
                >
                  <Box
                    component="span"
                    sx={(theme) => ({ 
                      display: 'inline-flex',
                      mr: 1.5,
                      fontSize: '1.2rem',
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.primary.main, 0.15)
                        : 'transparent',
                      padding: theme.palette.mode === 'dark' ? '3px' : '0px',
                      borderRadius: theme.palette.mode === 'dark' ? '50%' : '0',
                    })}
                  >
                    📝
                  </Box>
                  Questions & Answers
                </Typography>
                
                {/* Show message about filtered questions for adaptive tests */}                {selectedTest.is_adaptive && (
                  <Typography
                    variant="caption"
                    sx={(theme) => ({
                      ml: 2,
                      px: 1.5,
                      py: 0.5,
                      bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.info.dark, 0.7)
                        : theme.palette.info.light,
                      color: 'white',
                      borderRadius: 1,
                      fontStyle: 'italic',
                      fontWeight: 'medium',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? `0 0 8px ${alpha(theme.palette.info.main, 0.3)}`
                        : 'none'
                    })}
                  >Showing only attempted questions ({
                      selectedTest.questions_attempted !== undefined ? 
                      selectedTest.questions_attempted : 
                      selectedTest.questions.filter(q => 
                        (q.selected_option_index !== undefined && q.selected_option_index !== null) || 
                        ((q as any).selected_option !== undefined && (q as any).selected_option !== null) || 
                        ((q as any).answer !== undefined && (q as any).answer !== null)
                      ).length                    } of {
                      selectedTest.questions_attempted !== undefined ? 
                      selectedTest.questions_attempted : 
                      selectedTest.questions.filter(q => 
                        (q.selected_option_index !== undefined && q.selected_option_index !== null) || 
                        ((q as any).selected_option !== undefined && (q as any).selected_option !== null) || 
                        ((q as any).answer !== undefined && (q as any).answer !== null)
                      ).length
                    })
                  </Typography>
                )}
              </Box>
              
              {/* Questions with answers */}
              {selectedTest.questions && Array.isArray(selectedTest.questions) ? (
                (() => {                  // For adaptive tests, filter only attempted questions  
                  let displayQuestions = selectedTest.questions;
                  if (selectedTest.is_adaptive) {
                    displayQuestions = selectedTest.questions.filter(q => {
                      const hasSelection = (q.selected_option_index !== undefined && q.selected_option_index !== null) ||
                        ((q as any).selected_option !== undefined && (q as any).selected_option !== null) ||
                        ((q as any).answer !== undefined && (q as any).answer !== null);
                      
                      // Also check for positive marks as indication of attempt
                      const hasMarks = q.marks !== undefined && q.marks !== null && (
                        (typeof q.marks === 'number' && q.marks > 0) ||
                        (typeof q.marks === 'string' && parseFloat(q.marks) > 0) ||
                        (typeof q.marks === 'boolean' && q.marks === true)
                      );
                      
                      return hasSelection || hasMarks;
                    });
                    console.log(`ResultsPage: Filtered ${displayQuestions.length} attempted questions out of ${selectedTest.questions.length} total questions`);
                  }
                  return displayQuestions.length > 0 ? (
                    displayQuestions.map((q, index) => (                      <Paper 
                        key={q.question_id} 
                        sx={(theme) => ({ 
                          p: 0, 
                          mb: 3, 
                          borderRadius: 2,
                          overflow: 'hidden',
                          boxShadow: theme.palette.mode === 'dark' ? 1 : 3,
                          border: '1px solid',
                          borderColor: q.is_correct 
                            ? theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.success.main, 0.7)
                              : theme.palette.success.light
                            : theme.palette.mode === 'dark'
                              ? alpha(theme.palette.error.main, 0.7)
                              : theme.palette.error.light,
                          transition: 'transform 0.2s',
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? alpha(theme.palette.background.paper, 0.6)
                            : theme.palette.background.paper,
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: theme.palette.mode === 'dark' ? 4 : 5,
                          }
                        })}
                      >                        <Box sx={(theme) => ({ 
                          bgcolor: q.is_correct 
                            ? theme.palette.mode === 'dark'
                              ? alpha(theme.palette.success.dark, 0.8)
                              : theme.palette.success.light
                            : theme.palette.mode === 'dark'
                              ? alpha(theme.palette.error.dark, 0.8)
                              : theme.palette.error.light,
                          p: 1,
                          pl: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: theme.palette.mode === 'dark' ? 'inset 0 -1px 0 rgba(0,0,0,0.2)' : 'none'
                        })}>
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              color: 'white', 
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            Question {index + 1}
                            {q.is_correct ? 
                              <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>✓</Box> : 
                              <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>✗</Box>
                            }
                          </Typography>
                          <Chip 
                            label={q.is_correct ? "Correct" : "Incorrect"} 
                            size="small"
                            sx={{ 
                              bgcolor: 'white', 
                              color: q.is_correct ? 'success.dark' : 'error.dark',
                              fontWeight: 'bold',
                              mr: 1
                            }} 
                          />
                        </Box>
                        <Box sx={{ p: 2 }}>                          <Typography 
                            variant="body1" 
                            gutterBottom 
                            sx={(theme) => ({ 
                              fontWeight: 'medium',
                              backgroundColor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.background.default, 0.4) 
                                : 'rgba(0,0,0,0.02)',
                              p: 1.5,
                              borderRadius: 1,
                              borderLeft: '3px solid',
                              borderLeftColor: theme.palette.primary.main,
                              color: theme.palette.text.primary
                            })}
                          >
                            {q.question_text}
                          </Typography>
                          {q.options && Array.isArray(q.options) ? (
                            q.options.length > 0 ? (
                              q.options.map((option, optIndex) => {
                                // Debug log the option and comparison values
                                console.log(`Question ${index + 1}, Option ${optIndex}:`, {
                                  option_id: option.option_id,
                                  option_order: option.option_order,
                                  option_text: option.option_text,
                                  selected_option_index: q.selected_option_index,
                                  correct_option_index: q.correct_option_index
                                });
                                
                                // More flexible comparison that checks both option_id and option_order
                                const isSelected = 
                                  q.selected_option_index === option.option_id || 
                                  q.selected_option_index === option.option_order ||
                                  q.selected_option_index === optIndex;
                                  
                                const isCorrect = 
                                  q.correct_option_index === option.option_id || 
                                  q.correct_option_index === option.option_order ||
                                  q.correct_option_index === optIndex;
                                  
                                const isWrongSelection = isSelected && !isCorrect;
                                
                                return (
                                  <Box 
                                    key={option.option_id || optIndex}
                                    sx={{
                                      p: 1.5,
                                      my: 1,
                                      borderRadius: 1.5,                                      backgroundColor: (theme) => 
                                        isCorrect
                                          ? theme.palette.mode === 'dark' 
                                            ? alpha(theme.palette.success.main, 0.2)
                                            : 'rgba(76, 175, 80, 0.15)'
                                          : isWrongSelection
                                          ? theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.error.main, 0.2)
                                            : 'rgba(244, 67, 54, 0.15)'
                                          : theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.action.hover, 0.1)
                                            : 'rgba(224, 224, 224, 0.1)',
                                      border: '1px solid',
                                      borderColor: (theme) =>
                                        isCorrect
                                          ? theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.success.main, 0.6)
                                            : theme.palette.success.main
                                          : isWrongSelection
                                          ? theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.error.main, 0.6)
                                            : theme.palette.error.main
                                          : theme.palette.divider,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      boxShadow: isSelected || isCorrect ? 1 : 0,
                                      transition: 'all 0.2s ease-in-out',
                                      '&:hover': {
                                        boxShadow: 1
                                      }
                                    }}
                                  >
                                    <Box display="flex" alignItems="center">                                      <Box 
                                        sx={(theme) => ({
                                          width: 28,
                                          height: 28,
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          mr: 2,
                                          backgroundColor: 
                                            isCorrect
                                              ? theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.success.main, 0.8)
                                                : theme.palette.success.main
                                              : isWrongSelection
                                              ? theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.error.main, 0.8)
                                                : theme.palette.error.main
                                              : theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.grey[600], 0.5)
                                                : theme.palette.grey[300],
                                          color: isCorrect || isWrongSelection 
                                            ? 'white' 
                                            : theme.palette.mode === 'dark'
                                              ? theme.palette.common.white
                                              : theme.palette.text.primary,
                                          boxShadow: theme.palette.mode === 'dark'
                                            ? '0 0 5px rgba(0,0,0,0.2)'
                                            : 'none',
                                        })}
                                      >
                                        {String.fromCharCode(65 + option.option_order)}
                                      </Box>                                      <Typography
                                        variant="body2"
                                        sx={(theme) => ({
                                          color:
                                            isCorrect
                                              ? theme.palette.mode === 'dark'
                                                ? theme.palette.success.light
                                                : theme.palette.success.main
                                              : isWrongSelection
                                              ? theme.palette.mode === 'dark'
                                                ? theme.palette.error.light
                                                : theme.palette.error.main
                                              : theme.palette.text.primary,
                                          fontWeight:
                                            isSelected || isCorrect
                                              ? 'bold'
                                              : 'normal',
                                        })}>
                                        {/* Enhanced option text display with fallbacks */}
                                        {option.option_text || 
                                         (option as any).text || 
                                         (option as any).value || 
                                         `Option ${String.fromCharCode(65 + optIndex)}`}
                                      </Typography>
                                    </Box>
                                    
                                    <Box>
                                      {isSelected && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            bgcolor: isCorrect ? 'success.light' : 'error.light',
                                            color: 'white',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {isCorrect ? '✓ Your Answer' : '✗ Your Answer'}
                                        </Typography>
                                      )}
                                      {isCorrect && !isSelected && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            bgcolor: 'success.light',
                                            color: 'white',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          Correct Answer
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })                            ) : (
                              <Typography 
                                color="text.secondary" 
                                sx={(theme) => ({ 
                                  mt: 1, 
                                  p: 2, 
                                  bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.default, 0.4)
                                    : theme.palette.background.default, 
                                  borderRadius: 1,
                                  border: theme.palette.mode === 'dark' 
                                    ? `1px dashed ${alpha(theme.palette.divider, 0.3)}` 
                                    : 'none'
                                })}
                              >
                                No options data available for this question.
                              </Typography>
                            )
                          ) : (
                            <Typography color="error" sx={{ mt: 1, p: 2, bgcolor: 'error.light', color: 'white', borderRadius: 1 }}>
                              Error: Options data is missing or invalid.
                            </Typography>
                          )}
                            <Box sx={(theme) => ({ 
                            mt: 2, 
                            p: 1.5, 
                            borderRadius: theme.palette.mode === 'dark' ? 1 : 0,
                            backgroundColor: theme.palette.mode === 'dark'
                              ? q.is_correct 
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.error.main, 0.1)
                              : q.is_correct 
                                ? 'rgba(76, 175, 80, 0.05)'
                                : 'rgba(244, 67, 54, 0.05)',
                            border: theme.palette.mode === 'dark' 
                              ? `1px solid ${
                                  q.is_correct 
                                    ? alpha(theme.palette.success.main, 0.2)
                                    : alpha(theme.palette.error.main, 0.2)
                                }`
                              : 'none'
                          })}>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={(theme) => ({
                                color: theme.palette.mode === 'dark'
                                  ? q.is_correct 
                                    ? theme.palette.success.light
                                    : theme.palette.error.light
                                  : q.is_correct 
                                    ? theme.palette.success.main
                                    : theme.palette.error.main,
                                textShadow: theme.palette.mode === 'dark'
                                  ? '0px 0px 1px rgba(0,0,0,0.2)'
                                  : 'none'
                              })}
                            >
                              {q.is_correct ? '✓ Correct' : '✗ Incorrect'}
                            </Typography>
                            {!q.is_correct && (
                              <Typography 
                                variant="body2" 
                                sx={(theme) => ({
                                  mt: 1, 
                                  color: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.text.secondary, 0.9)
                                    : theme.palette.text.secondary,
                                  padding: 1,
                                  borderRadius: 1,
                                  backgroundColor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.paper, 0.4)
                                    : 'transparent'
                                })}
                              >
                                <b>Explanation:</b> {q.explanation || "No explanation available."}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                    </Paper>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No questions to display.
                  </Typography>
                );
                })()
              ) : null}
            </Box>
          )}        </DialogContent>
      </Dialog>
    </Box>
  );
};
