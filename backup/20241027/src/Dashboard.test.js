import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders Dashboard component', () => {
  // Mock data prop with valid structure
  const mockData = {
    features: [
      {
        date: '2023-01-01',
        commodity: 'commodity',
        regime: 'regime',
        price: 100,
        usdprice: 10,
        conflict_intensity: 5,
      },
    ],
  };

  render(
    <Dashboard
      data={mockData}
      selectedCommodity="commodity"
      selectedRegimes={['regime']}
      selectedAnalysis=""
    />
  );

  // Look for the "Price Type" label
  const priceTypeLabel = screen.getByLabelText(/Price Type/i);
  
  expect(priceTypeLabel).toBeInTheDocument();
});