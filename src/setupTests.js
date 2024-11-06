// src/setupTests.js
import '@testing-library/jest-dom';
import 'jest-styled-components';
import jest from 'jest-mock';
import PropTypes from 'prop-types';
import React from 'react';



// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: () => {
    const Link = ({ children, to }) => <a href={to}>{children}</a>;
    return Link;
  },
}));

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaChartBar: () => <span data-testid="chart-icon" />,
  FaDollarSign: () => <span data-testid="dollar-icon" />,
  FaMapMarkedAlt: () => <span data-testid="map-icon" />,
}));