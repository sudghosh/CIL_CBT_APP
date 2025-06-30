import React from 'react';
import { render, screen } from '@testing-library/react';
import ChartContainer from '../ChartContainer';
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const mockData = [
  { name: 'Page A', value: 400 },
  { name: 'Page B', value: 300 },
  { name: 'Page C', value: 200 },
];

describe('ChartContainer', () => {
  test('renders the chart title and description correctly', () => {
    render(
      <ChartContainer 
        title="Test Chart"
        description="Test description"
      >
        <LineChart data={mockData}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
          <XAxis dataKey="name" />
          <YAxis />
        </LineChart>
      </ChartContainer>
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
  
  test('renders loading state correctly', () => {
    render(
      <ChartContainer 
        title="Test Chart"
        loading={true}
      >
        <LineChart data={mockData}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ChartContainer>
    );
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  
  test('renders error state correctly', () => {
    render(
      <ChartContainer 
        title="Test Chart"
        error="Test error message"
      >
        <LineChart data={mockData}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ChartContainer>
    );
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
  
  test('renders empty state correctly', () => {
    render(
      <ChartContainer 
        title="Test Chart"
        isEmpty={true}
        emptyMessage="No data available"
      >
        <LineChart data={mockData}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ChartContainer>
    );
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
  
  test('renders chart actions correctly', () => {
    const mockAction = <button>Test Action</button>;
    
    render(
      <ChartContainer 
        title="Test Chart"
        actions={mockAction}
      >
        <LineChart data={mockData}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ChartContainer>
    );
    
    expect(screen.getByRole('button', { name: 'Test Action' })).toBeInTheDocument();
  });
});
