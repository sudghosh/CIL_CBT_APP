import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceDashboard } from '../pages/PerformanceDashboard';
import { performanceAPI } from '../services/api';
import { BrowserRouter } from 'react-router-dom';

// Mock the performance API
jest.mock('../../services/api', () => ({
  performanceAPI: {
    getOverallPerformance: jest.fn(),
    getTopicPerformance: jest.fn(),
    getDifficultyPerformance: jest.fn(),
    getTimePerformance: jest.fn(),
    getDifficultyTrends: jest.fn(),
    getTopicMastery: jest.fn(),
    getRecommendations: jest.fn(),
    getPerformanceComparison: jest.fn()
  }
}));

// Mock the RestrictedAccessFallback component
jest.mock('../components/RestrictedAccessFallback', () => ({
  __esModule: true,
  default: ({ message, fallbackContent }: { message: string, fallbackContent?: React.ReactNode }) => (
    <div data-testid="restricted-access-fallback">
      <div data-testid="restricted-message">{message}</div>
      {fallbackContent && <div data-testid="fallback-content">{fallbackContent}</div>}
    </div>
  )
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: ({ children }: { children: React.ReactNode }) => <div data-testid="line">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,  Bar: () => <div data-testid="bar" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Pie: () => <div data-testid="pie" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful responses by default
    (performanceAPI.getOverallPerformance as jest.Mock).mockResolvedValue({});
    (performanceAPI.getTopicPerformance as jest.Mock).mockResolvedValue([]);
    (performanceAPI.getDifficultyPerformance as jest.Mock).mockResolvedValue({});
    (performanceAPI.getTimePerformance as jest.Mock).mockResolvedValue({});
    (performanceAPI.getDifficultyTrends as jest.Mock).mockResolvedValue({});
    (performanceAPI.getTopicMastery as jest.Mock).mockResolvedValue({});
    (performanceAPI.getRecommendations as jest.Mock).mockResolvedValue([]);
    (performanceAPI.getPerformanceComparison as jest.Mock).mockResolvedValue({});
  });

  it('should render the dashboard with tabs', async () => {
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Wait for initial render
    await waitFor(() => expect(screen.getByText(/Performance Dashboard/i)).toBeInTheDocument());
    
    // Check for tabs
    expect(screen.getByText(/Difficulty Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Topic Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/Performance Comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/Mastery Trends/i)).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Check for loading indicators
    expect(screen.getByTestId('loading-overall-performance')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Wait for initial render
    await waitFor(() => expect(screen.getByText(/Performance Dashboard/i)).toBeInTheDocument());
    
    // Initial tab (Difficulty Analysis) should be active
    expect(screen.getByText(/Difficulty Analysis/i).closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
    
    // Click on Recommendations tab
    fireEvent.click(screen.getByText(/Recommendations/i));
    
    // Recommendations tab should now be active
    expect(screen.getByText(/Recommendations/i).closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
    
    // Click on Performance Comparison tab
    fireEvent.click(screen.getByText(/Performance Comparison/i));
    
    // Performance Comparison tab should now be active
    expect(screen.getByText(/Performance Comparison/i).closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('should show RestrictedAccessFallback when Recommendations returns 403', async () => {
    // Mock a 403 error response for Recommendations
    (performanceAPI.getRecommendations as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'You do not have access to personalized recommendations',
      data: null
    });
    
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Click on Recommendations tab
    fireEvent.click(screen.getByText(/Recommendations/i));
    
    // Wait for the RestrictedAccessFallback to be rendered
    await waitFor(() => expect(screen.getByTestId('restricted-access-fallback')).toBeInTheDocument());
    
    // Check that it contains the correct message
    expect(screen.getByTestId('restricted-message')).toHaveTextContent('You do not have access to personalized recommendations');
  });

  it('should show RestrictedAccessFallback when Performance Comparison returns 403', async () => {
    // Mock a 403 error response for Performance Comparison
    (performanceAPI.getPerformanceComparison as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'You do not have access to performance comparison data',
      data: null
    });
    
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Click on Performance Comparison tab
    fireEvent.click(screen.getByText(/Performance Comparison/i));
    
    // Wait for the RestrictedAccessFallback to be rendered
    await waitFor(() => expect(screen.getByTestId('restricted-access-fallback')).toBeInTheDocument());
    
    // Check that it contains the correct message
    expect(screen.getByTestId('restricted-message')).toHaveTextContent('You do not have access to performance comparison data');
  });

  it('should show RestrictedAccessFallback when Topic Mastery returns 403', async () => {
    // Mock a 403 error response for Topic Mastery
    (performanceAPI.getTopicMastery as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'You do not have access to topic mastery data',
      data: null
    });
    
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Click on Mastery Trends tab
    fireEvent.click(screen.getByText(/Mastery Trends/i));
    
    // Wait for the RestrictedAccessFallback to be rendered
    await waitFor(() => expect(screen.getByTestId('restricted-access-fallback')).toBeInTheDocument());
    
    // Check that it contains the correct message
    expect(screen.getByTestId('restricted-message')).toHaveTextContent('You do not have access to topic mastery data');
  });

  it('should show RestrictedAccessFallback when Difficulty Trends returns 403', async () => {
    // Mock a 403 error response for Difficulty Trends
    (performanceAPI.getDifficultyTrends as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'You do not have access to difficulty trends data',
      data: null
    });
    
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Wait for the RestrictedAccessFallback to be rendered (assuming it's in the default difficulty tab)
    await waitFor(() => expect(screen.getByTestId('restricted-access-fallback')).toBeInTheDocument());
    
    // Check that it contains the correct message
    expect(screen.getByTestId('restricted-message')).toHaveTextContent('You do not have access to difficulty trends data');
  });
  
  it('should display restricted indicators next to tabs with privileged data', async () => {
    render(
      <BrowserRouter>
        <PerformanceDashboard />
      </BrowserRouter>
    );
    
    // Wait for initial render
    await waitFor(() => expect(screen.getByText(/Performance Dashboard/i)).toBeInTheDocument());
    
    // Check for the restricted indicators on appropriate tabs
    const recommendationsTab = screen.getByText(/Recommendations/i).closest('[role="tab"]');
    const performanceComparisonTab = screen.getByText(/Performance Comparison/i).closest('[role="tab"]');
    
    expect(recommendationsTab?.textContent).toContain('Restricted');
    expect(performanceComparisonTab?.textContent).toContain('Restricted');
  });
});
