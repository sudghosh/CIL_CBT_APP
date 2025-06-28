import React from 'react';
import { render, screen } from '@testing-library/react';
import ChartRestrictedAccess from '../ChartRestrictedAccess';

describe('ChartRestrictedAccess', () => {
  test('renders restricted access message correctly', () => {
    render(
      <ChartRestrictedAccess 
        message="You do not have access to this feature"
        featureName="Test Feature"
      />
    );
    
    expect(screen.getByText('You do not have access to this feature')).toBeInTheDocument();
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Feature Restricted')).toBeInTheDocument();
  });
  
  test('renders fallback content when provided', () => {
    const fallbackContent = <div data-testid="fallback">Fallback content</div>;
    
    render(
      <ChartRestrictedAccess 
        message="Access restricted"
        featureName="Test Feature"
        fallbackContent={fallbackContent}
      />
    );
    
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });
  
  test('shows upgrade button when upgradable', () => {
    render(
      <ChartRestrictedAccess 
        message="Access restricted"
        featureName="Premium Feature"
        upgradable={true}
        onUpgradeClick={() => {}}
      />
    );
    
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
  
  test('does not show upgrade button when not upgradable', () => {
    render(
      <ChartRestrictedAccess 
        message="Access restricted"
        featureName="Premium Feature"
        upgradable={false}
      />
    );
    
    expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
  });
});
