// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Typography } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { styled } from '@mui/material/styles';

const TitleTypography = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
  },
}));

const Header = ({ isDarkMode, toggleDarkMode}) => {
  return (
    <>
      <TitleTypography variant="h6" noWrap component="div">
        Yemen Market Analysis Dashboard
      </TitleTypography>
      <IconButton
        onClick={toggleDarkMode}
        color="inherit"
        aria-label="toggle dark mode"
      >
        {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </>
  );
};

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
  isSmUp: PropTypes.bool.isRequired,
};

export default Header;
