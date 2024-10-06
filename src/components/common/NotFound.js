// src/components/common/NotFound.js

import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
`;

const NotFoundTitle = styled.h1`
  font-size: 4rem;
  color: ${props => props.theme.primaryColor};
  margin-bottom: 1rem;
`;

const NotFoundText = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2rem;
`;

const HomeLink = styled(Link)`
  padding: 10px 20px;
  background-color: ${props => props.theme.primaryColor};
  color: white;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.secondaryColor};
  }
`;

const NotFound = () => {
  return (
    <NotFoundContainer>
      <NotFoundTitle>404</NotFoundTitle>
      <NotFoundText>Oops! The page you&apos;re looking for doesn&apos;t exist.</NotFoundText>
      <HomeLink to="/">Go to Homepage</HomeLink>
    </NotFoundContainer>
  );
};

export default NotFound;