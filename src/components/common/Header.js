// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Header = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <>
      <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
        Yemen Market Analysis
      </Typography>
      <IconButton color="inherit" onClick={toggleDarkMode}>
        {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </>
  );
};

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;