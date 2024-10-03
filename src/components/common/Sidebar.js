// src/components/common/Sidebar.js
import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import ThemeToggle from './ThemeToggle';
import { FaTachometerAlt, FaChartLine, FaDollarSign, FaMapMarkedAlt } from 'react-icons/fa';

// Keyframes for hover animations
const hoverAnimation = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(5px);
  }
`;

// Sidebar container with glassmorphism and gradient
const SidebarContainer = styled.aside`
  width: 250px;
  height: 100vh;
  background: ${(props) => props.theme.sidebarBackground};
  backdrop-filter: blur(15px);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 2px 0 15px rgba(0, 0, 0, 0.2);
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2rem 1.5rem;
  transition: transform 0.3s ease-in-out, background 0.3s ease-in-out;

  /* Enhanced outline */
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;

  /* Slide out when not open */
  transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};

  /* Responsive adjustments */
  @media (max-width: 768px) {
    width: 200px;
    padding: 1.5rem 1rem;
  }

  @media (max-width: 480px) {
    width: 180px;
    padding: 1rem 0.8rem;
  }
`;

// Navigation links container
const NavLinks = styled.nav`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// Styled NavLink with icons and enhanced styles
const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  height: 50px;
  padding: 0 1rem;
  font-size: 1rem;
  color: ${(props) => props.theme.sidebarText};
  text-decoration: none;
  border-radius: 10px;
  transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

  /* Icon styling */
  svg {
    margin-right: 0.8rem;
    transition: color 0.3s ease;
    color: ${(props) => props.theme.sidebarIcon};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    animation: ${hoverAnimation} 0.3s forwards;
    transform: translateX(3px);

    svg {
      color: ${(props) => props.theme.primaryColor};
    }
  }

  &.active {
    background: linear-gradient(135deg, ${(props) => props.theme.primaryColor}, ${(props) => props.theme.secondaryColor});
    box-shadow: 0 8px 16px rgba(187, 134, 252, 0.4);
    color: #ffffff;

    svg {
      color: #ffffff;
    }
  }
`;

// Label for the sidebar (optional)
const SidebarLabel = styled.h2`
  font-size: 1.5rem;
  color: ${(props) => props.theme.sidebarText};
  margin-bottom: 2rem;
  text-align: center;
  font-family: 'Inter', sans-serif;
  user-select: none;

  /* Responsive adjustments */
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

// Footer container for ThemeToggle
const Footer = styled.div`
  margin-top: auto;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
`;

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <SidebarContainer isOpen={isOpen}>
      {/* Optional Sidebar Label */}
      <SidebarLabel>Yemen Dashboard</SidebarLabel>

      <NavLinks>
        <StyledNavLink exact="true" to="/" activeclassname="active" onClick={toggleSidebar}>
          <FaTachometerAlt />
          Dashboard
        </StyledNavLink>
        <StyledNavLink to="/ecm" activeclassname="active" onClick={toggleSidebar}>
          <FaChartLine />
          ECM Analysis
        </StyledNavLink>
        <StyledNavLink to="/price-diff" activeclassname="active" onClick={toggleSidebar}>
          <FaDollarSign />
          Price Differential
        </StyledNavLink>
        <StyledNavLink to="/spatial" activeclassname="active" onClick={toggleSidebar}>
          <FaMapMarkedAlt />
          Spatial Analysis
        </StyledNavLink>
      </NavLinks>

      <Footer>
        <ThemeToggle />
      </Footer>
    </SidebarContainer>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};

export default Sidebar;