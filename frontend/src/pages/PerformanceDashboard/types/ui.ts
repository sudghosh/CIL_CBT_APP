/**
 * Dashboard UI Component Types
 * 
 * Interfaces for layout, navigation, and UI components
 */

import { TimePeriod, ErrorState, LoadingState } from './api';

/**
 * Dashboard tab configuration
 */
export interface DashboardTab {
  id: string;
  label: string;
  icon?: React.ComponentType;
  disabled?: boolean;
  restricted?: boolean;
}

/**
 * Filter and control state
 */
export interface DashboardFilters {
  timePeriod: TimePeriod;
  selectedTopics: string[];
  difficultyLevels: Array<'easy' | 'medium' | 'hard'>;
}

/**
 * Dashboard view state
 */
export interface DashboardViewState {
  activeTab: number;
  filters: DashboardFilters;
  loading: LoadingState;
  error: ErrorState;
  lastRefresh: string;
}

/**
 * Metric card display data
 */
export interface MetricCardData {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ComponentType;
}

/**
 * Tab panel props
 */
export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  className?: string;
}

/**
 * Dashboard layout props
 */
export interface DashboardLayoutProps {
  title?: string;
  subtitle?: string;
  tabs: DashboardTab[];
  activeTab: number;
  onTabChange: (index: number) => void;
  filters?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
}

/**
 * Access control state
 */
export interface AccessControlState {
  hasPersonalizedAccess: boolean;
  isCheckingAccess: boolean;
  allowedEmails: string[];
}

/**
 * Dashboard actions
 */
export interface DashboardActions {
  refreshData: () => Promise<void>;
  updateFilters: (filters: Partial<DashboardFilters>) => void;
  changeTab: (tabIndex: number) => void;
  resetError: () => void;
}
