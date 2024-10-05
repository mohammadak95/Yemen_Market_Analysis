// src/Dashboard.test.js
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

test('dashboard links have correct href attributes', () => {
  render(
    <Router>
      <Dashboard />
    </Router>
  );

  expect(screen.getByText('ECM Analysis').closest('a')).toHaveAttribute('href', '/ecm');
  expect(screen.getByText('Price Differential Analysis').closest('a')).toHaveAttribute('href', '/price-diff');
  expect(screen.getByText('Spatial Analysis').closest('a')).toHaveAttribute('href', '/spatial');
});