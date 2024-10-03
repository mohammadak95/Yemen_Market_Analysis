// Sidebar.js
import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { styled } from '@mui/system';
import ThemeToggle from './ThemeToggle';


const SidebarContainer = styled('aside')`
  width: 250px;
  height: 100vh;
  background-color: ${props => props.theme.sidebarBackground || '#fff'};
  color: ${props => props.theme.sidebarText || '#333'};
  position: fixed;
  left: 0;
  top: 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease-in-out;
`;

const NavLinks = styled('nav')`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

const StyledNavLink = styled(NavLink)`
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 1rem;
  color: ${props => props.theme.sidebarText || '#333'};
  text-decoration: none;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  border-radius: 5px;

  &:hover, &.active {
    background-color: ${props => props.theme.sidebarActiveBackground || '#f0f0f0'};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const Sidebar = ({ isOpen }) => {
  return (
    <SidebarContainer isOpen={isOpen}>
      <NavLinks>
        <StyledNavLink exact to="/">Dashboard</StyledNavLink>
        <StyledNavLink to="/ecm">ECM Analysis</StyledNavLink>
        <StyledNavLink to="/price-diff">Price Differential</StyledNavLink>
        <StyledNavLink to="/spatial">Spatial Analysis</StyledNavLink>
      </NavLinks>
      <ThemeToggle />
    </SidebarContainer>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default Sidebar;