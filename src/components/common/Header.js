// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Header = ({ isDarkMode, toggleDarkMode }) => {
  const theme = useTheme();

  return (
    <>
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{
          flexGrow: 1,
          [theme.breakpoints.down('sm')]: {
            fontSize: '1rem',
          },
        }}
      >
        Yemen Market Analysis Dashboard
      </Typography>
      <IconButton onClick={toggleDarkMode} color="inherit" aria-label="toggle dark mode">
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