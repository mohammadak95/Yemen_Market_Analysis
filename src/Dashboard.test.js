// src/Dashboard.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock the useData hook
jest.mock('./hooks/useData', () => ({
  __esModule: true,
  default: () => ({
    data: { commodities: [], regimes: [] },
    loading: false,
    error: null,
  }),
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: () => null,
}));

test('renders Dashboard component', () => {
  render(<Dashboard selectedCommodity="" selectedRegime="" />);
  const headingElement = screen.getByText(/Yemen Market Analysis Dashboard/i);
  expect(headingElement).toBeInTheDocument();
});