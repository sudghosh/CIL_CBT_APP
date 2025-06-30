import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DifficultyTrendsChart from '../difficulty/DifficultyTrendsChart';
import { performanceAPI } from '../../../services/api';

// Mock the API module
jest.mock('../../../services/api', () => ({
  performanceAPI: {
    getDifficultyTrends: jest.fn()
  }
}));

describe('DifficultyTrendsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders loading state initially', () => {
    // Setup mock to return a promise that doesn't resolve immediately
    (performanceAPI.getDifficultyTrends as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(<DifficultyTrendsChart />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  
  test('renders chart when data is loaded successfully', async () => {
    // Mock successful API response
    const mockData = {
      status: 'success',
      data: {
        overall: [
          { date: '2023-01-01', average_difficulty: 5.5, user_difficulty: 6.0 },
          { date: '2023-01-02', average_difficulty: 5.7, user_difficulty: 6.2 }
        ],
        by_topic: {}
      }
    };
    
    (performanceAPI.getDifficultyTrends as jest.Mock).mockResolvedValue(mockData);
    
    render(<DifficultyTrendsChart />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Check that title and description are rendered
    expect(screen.getByText('Difficulty Trends')).toBeInTheDocument();
    expect(screen.getByText('Track how question difficulty changes over time')).toBeInTheDocument();
  });
  
  test('renders error state when API returns error', async () => {
    // Mock error API response
    const mockError = {
      status: 'error',
      message: 'Failed to load data',
      data: null
    };
    
    (performanceAPI.getDifficultyTrends as jest.Mock).mockResolvedValue(mockError);
    
    render(<DifficultyTrendsChart />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Check that error message is displayed
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });
  
  test('renders access restricted message when appropriate', async () => {
    // Mock access restriction response
    const mockAccessError = {
      status: 'error',
      message: 'You do not have access to personalized difficulty data.',
      data: null
    };
    
    (performanceAPI.getDifficultyTrends as jest.Mock).mockResolvedValue(mockAccessError);
    
    render(<DifficultyTrendsChart enablePersonalization={true} />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Check that restricted access message is displayed
    expect(screen.getByText('You do not have access to personalized difficulty data.')).toBeInTheDocument();
  });
});
