/**
 * Performance Dashboard - Modern Architecture
 * 
 * This is the main entry point for the new Performance Dashboard implementation.
 * Built with modern React patterns, TypeScript, and Material-UI.
 * 
 * Architecture:
 * - types/: TypeScript interfaces and type definitions
 * - hooks/: Custom React hooks for data fetching and state management
 * - components/: Modular, reusable chart and UI components
 * - utils/: Helper functions and utilities
 */

// Export all types
export * from './types';

// Export all hooks
export * from './hooks';

// Export all components
export * from './components';

// Export all utilities
export * from './utils';

// Main component exports
export { PerformanceDashboard } from './PerformanceDashboard';
export { PerformanceDashboardEnhanced } from './PerformanceDashboardEnhanced';

// Default export - the enhanced dashboard as the primary component
export { PerformanceDashboardEnhanced as default } from './PerformanceDashboardEnhanced';
