import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const SidebarContainer = styled.div`
  width: 250px;
  height: 100vh;
  background-color: ${props => props.theme.sidebarBackground};
  color: ${props => props.theme.sidebarText};
  padding: 20px;
  position: fixed;
  left: 0;
  top: 0;
`;

const NavItem = styled(NavLink)`
  display: block;
  padding: 10px;
  color: ${props => props.theme.sidebarText};
  text-decoration: none;
  &.active {
    background-color: ${props => props.theme.sidebarActiveBackground};
  }
  &:hover {
    background-color: ${props => props.theme.sidebarHoverBackground};
  }
`;

const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <SidebarContainer>
      <h2>{t('sidebar.title')}</h2>
      <nav>
        <NavItem exact to="/">{t('sidebar.dashboard')}</NavItem>
        <NavItem to="/ecm">{t('sidebar.ecm')}</NavItem>
        <NavItem to="/price-diff">{t('sidebar.priceDiff')}</NavItem>
        <NavItem to="/spatial">{t('sidebar.spatial')}</NavItem>
      </nav>
    </SidebarContainer>
  );
};

export default Sidebar;