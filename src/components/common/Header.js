import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const HeaderContainer = styled.header`
  background-color: ${props => props.theme.primaryBackground};
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Nav = styled.nav`
  display: flex;
  gap: 1rem;
`;

const NavLink = styled(Link)`
  color: ${props => props.theme.text};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Header = () => {
  const { t } = useTranslation();

  return (
    <HeaderContainer>
      <NavLink to="/">{t('header.title')}</NavLink>
      <Nav>
        <NavLink to="/ecm">{t('header.ecm')}</NavLink>
        <NavLink to="/price-diff">{t('header.priceDiff')}</NavLink>
        <NavLink to="/spatial">{t('header.spatial')}</NavLink>
      </Nav>
      <div>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </HeaderContainer>
  );
};

export default Header;