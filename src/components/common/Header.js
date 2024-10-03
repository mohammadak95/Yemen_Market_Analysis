// Header.js (updated)
import React from 'react';
import { styled } from '@mui/system';
import ThemeToggle from './ThemeToggle';  // Keep the theme toggle

const HeaderContainer = styled('header')`
  background-color: ${props => props.theme.primaryBackground};
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;



const Header = () => {
  return (
    <HeaderContainer>
      <ThemeToggle />  {/* Keep the theme toggle button */}
    </HeaderContainer>
  );
};

export default Header;