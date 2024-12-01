// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Typography, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { styled } from '@mui/material/styles';

const TitleTypography = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
  },
}));

const Header = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
    </Box>
  );
};

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;
