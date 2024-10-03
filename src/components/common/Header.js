// src/components/common/Header.js
import React from 'react';
import styled from 'styled-components';
import ThemeToggle from './ThemeToggle';
import PropTypes from 'prop-types';
import { FaBars, FaUserCircle } from 'react-icons/fa';

const HeaderContainer = styled.header`
  background: ${(props) => props.theme.headerBackground};
  color: ${(props) => props.theme.textColor};
  padding: 0.8rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background 0.3s ease;
`;

const Brand = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  font-family: 'Inter', sans-serif;
  user-select: none;
  display: flex;
  align-items: center;

  /* Icon Styling */
  svg {
    margin-right: 8px;
    color: ${(props) => props.theme.primaryColor};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ToggleSidebarButton = styled.button`
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  color: ${(props) => props.theme.textColor};
  transition: color 0.3s ease;

  &:hover {
    color: ${(props) => props.theme.primaryColor};
  }

  svg {
    pointer-events: none;
  }
`;

const UserIcon = styled(FaUserCircle)`
  font-size: 1.5rem;
  color: ${(props) => props.theme.primaryColor};
  transition: color 0.3s ease;

  &:hover {
    color: ${(props) => props.theme.secondaryColor};
  }
`;

const Header = ({ toggleSidebar }) => {
  return (
    <HeaderContainer>
      <Brand>
        <FaBars />
        Yemen Market Analysis
      </Brand>
      <Actions>
        <ToggleSidebarButton onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <FaBars />
        </ToggleSidebarButton>
        <ThemeToggle />
        <UserIcon />
      </Actions>
    </HeaderContainer>
  );
};

Header.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
};

export default Header;