// src/Dashboard.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router } from 'react-router-dom';
import Dashboard from './Dashboard';

// Mock theme
const mockTheme = {
  textColor: '#000000',
  primaryColor: '#3b82f6',
};

test('renders dashboard links', () => {
  render(
    <ThemeProvider theme={mockTheme}>
      <Router>
        <Dashboard />
      </Router>
    </ThemeProvider>
  );
  
  expect(screen.getByText('ECM Analysis')).toBeInTheDocument();
  expect(screen.getByText('Price Differential Analysis')).toBeInTheDocument();
  expect(screen.getByText('Spatial Analysis')).toBeInTheDocument();
  
  expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
  expect(screen.getByTestId('dollar-icon')).toBeInTheDocument();
  expect(screen.getByTestId('map-icon')).toBeInTheDocument();
});

test('dashboard links have correct href attributes', () => {
  render(
    <ThemeProvider theme={mockTheme}>
      <Router>
        <Dashboard />
      </Router>
    </ThemeProvider>
  );

  expect(screen.getByText('ECM Analysis').closest('a')).toHaveAttribute('href', '/ecm');
  expect(screen.getByText('Price Differential Analysis').closest('a')).toHaveAttribute('href', '/price-diff');
  expect(screen.getByText('Spatial Analysis').closest('a')).toHaveAttribute('href', '/spatial');
});