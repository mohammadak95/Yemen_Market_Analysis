import React from 'react';
import { render } from '@testing-library/react';
import styled from 'styled-components'; // Import styled-components

const StyledDiv = styled.div` // Define StyledDiv here
  color: red;
`;

test('renders a styled div', () => {
  render(<StyledDiv />);
});