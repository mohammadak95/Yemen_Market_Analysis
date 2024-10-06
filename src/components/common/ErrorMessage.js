// src/components/common/ErrorMessage.js
import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const ErrorContainer = styled.div`
  background-color: ${props => props.theme.accentColor};
  color: white;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
`;

const ErrorMessage = ({ message }) => (
  <ErrorContainer>
    <strong>Error:</strong> {message}
  </ErrorContainer>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default ErrorMessage;