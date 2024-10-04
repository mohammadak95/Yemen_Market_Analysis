import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Dashboard from './Dashboard';

test('renders dashboard links', () => {
  render(
    <Router>
      <Dashboard />
    </Router>
  );
  
  expect(screen.getByText('ECM Analysis')).toBeInTheDocument();
  expect(screen.getByText('Price Differential Analysis')).toBeInTheDocument();
  expect(screen.getByText('Spatial Analysis')).toBeInTheDocument();
});