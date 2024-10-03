// Header.js (updated)
import React from 'react';
import { Link } from 'react-router-dom';
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

const Nav = styled('nav')`
  display: flex;
  gap: 1.5rem;
`;

const NavLink = styled(Link)`
  color: ${props => props.theme.text};
  text-decoration: none;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`;

const Header = () => {
  return (
    <HeaderContainer>
      <NavLink to="/">Dashboard</NavLink>  {/* Only Dashboard link remains */}
      <ThemeToggle />  {/* Keep the theme toggle button */}
    </HeaderContainer>
  );
};

export default Header;