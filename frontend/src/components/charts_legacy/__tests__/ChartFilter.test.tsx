import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartFilter, { ChartTimePeriod } from '../ChartFilter';

describe('ChartFilter', () => {
  test('renders all time period buttons', () => {
    const handleChange = jest.fn();
    render(
      <ChartFilter 
        timePeriod="month"
        onTimePeriodChange={handleChange}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Time' })).toBeInTheDocument();
  });
  
  test('selected time period has aria-pressed=true', () => {
    const handleChange = jest.fn();
    render(
      <ChartFilter 
        timePeriod="week"
        onTimePeriodChange={handleChange}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false');
  });
  
  test('calls onTimePeriodChange when a button is clicked', () => {
    const handleChange = jest.fn();
    render(
      <ChartFilter 
        timePeriod="month"
        onTimePeriodChange={handleChange}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(handleChange).toHaveBeenCalledWith('week');
    
    fireEvent.click(screen.getByRole('button', { name: 'Year' }));
    expect(handleChange).toHaveBeenCalledWith('year');
  });
  
  test('renders only specified available time periods', () => {
    const handleChange = jest.fn();
    render(
      <ChartFilter 
        timePeriod="month"
        onTimePeriodChange={handleChange}
        availableTimePeriods={['week', 'month']}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Year' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All Time' })).not.toBeInTheDocument();
  });
  
  test('renders with custom label', () => {
    const handleChange = jest.fn();
    render(
      <ChartFilter 
        timePeriod="month"
        onTimePeriodChange={handleChange}
        label="Custom Label"
      />
    );
    
    expect(screen.getByText('Custom Label:')).toBeInTheDocument();
  });
});
