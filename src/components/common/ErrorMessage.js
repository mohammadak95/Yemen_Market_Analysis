import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  background-color: ${props => props.theme.errorBackground};
  color: ${props => props.theme.errorText};
  padding: 20px;
  border-radius: 5px;
  margin: 20px 0;
`;

const ErrorMessage = ({ message }) => (
  <ErrorContainer>
    <h3>Error</h3>
    <p>{message}</p>
  </ErrorContainer>
);

export default ErrorMessage;