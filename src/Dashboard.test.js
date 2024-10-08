import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders Dashboard component', () => {
  // Mock data prop
  const mockData = {
    features: [],
  };

  render(
    <Dashboard
      data={mockData}
      selectedCommodity=""
      selectedRegime=""
      selectedAnalysis=""
    />
  );

  // Look for the "Price Type" label
  const priceTypeLabel = screen.getByLabelText(/Price Type/i);
  
  expect(priceTypeLabel).toBeInTheDocument();
});