// src/setupTests.js
import '@testing-library/jest-dom';
import 'jest-styled-components';

// Mock styled-components
jest.mock('styled-components', () => {
  const styled = {
    div: () => 'div',
    a: () => 'a',
    // Add other HTML elements as needed
  };
  styled.default = styled;
  return {
    ...jest.requireActual('styled-components'),
    styled,
    keyframes: () => 'keyframe-mock',
  };
});


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