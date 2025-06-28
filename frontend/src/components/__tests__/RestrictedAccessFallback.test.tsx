import React from 'react';
import { render, screen } from '../../__tests__/utils/test-utils';
import RestrictedAccessFallback from '../RestrictedAccessFallback';

describe('RestrictedAccessFallback', () => {
  it('renders with the provided message', () => {
    const testMessage = 'Test error message';
    render(<RestrictedAccessFallback message={testMessage} />);
    
    // Check if the message is displayed
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    
    // Check if the standard help text is displayed
    expect(screen.getByText(/This feature requires special permissions/i)).toBeInTheDocument();
    
    // Check alert component exists with correct severity
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('severity', 'info');
  });

  it('renders fallback content when provided', () => {
    const testMessage = 'Access restricted';
    const fallbackContent = <div data-testid="fallback">Alternative content</div>;
    
    render(<RestrictedAccessFallback message={testMessage} fallbackContent={fallbackContent} />);
    
    // Check if both the message and fallback content are displayed
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Alternative content')).toBeInTheDocument();
  });

  it('does not render fallback content box when not provided', () => {
    render(<RestrictedAccessFallback message="Access denied" />);
    
    // The fallback Box should not be in the document if no fallbackContent is provided
    // Since we can't easily test for absence of a Box, we'll check that only one Box exists
    // (the one inside the Alert)
    const boxes = document.querySelectorAll('.MuiBox-root');
    expect(boxes.length).toBe(1);
  });

  it('has correct styling', () => {
    render(<RestrictedAccessFallback message="Test message" />);
    
    // Check the Alert has margin-bottom
    const alert = screen.getByRole('alert');
    expect(alert).toHaveStyle('margin-bottom: 16px'); // mb: 2 translates to 16px in MUI
    
    // Check the Typography inside has proper variant
    const typography = screen.getByText(/This feature requires special permissions/i);
    expect(typography).toHaveClass('MuiTypography-body2');
  });
});
