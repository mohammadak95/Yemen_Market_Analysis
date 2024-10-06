// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material'; // Removed 'Box' from imports
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Header = ({ toggleSidebar, isDarkMode, toggleDarkMode }) => {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        {/* Optional Logo */}
        {/* <Box component="img" src="/path/to/logo.png" alt="Logo" sx={{ height: 40, mr: 2 }} /> */}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Yemen Market Analysis
        </Typography>
        {/* Dark Mode Toggle */}
        <IconButton color="inherit" onClick={toggleDarkMode}>
          {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

Header.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;