// src/Dashboard.test.js

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

  const headingElement = screen.getByText(/Market Analysis/i);
  expect(headingElement).toBeInTheDocument();
});