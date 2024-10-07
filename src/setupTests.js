// src/setupTests.js
import '@testing-library/jest-dom';
import 'jest-styled-components';



// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaChartBar: () => <span data-testid="chart-icon" />,
  FaDollarSign: () => <span data-testid="dollar-icon" />,
  FaMapMarkedAlt: () => <span data-testid="map-icon" />,
}));