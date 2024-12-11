// src/components/common/Header.js

import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Typography, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { styled } from '@mui/material/styles';

const TitleTypography = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 600,
  color: theme.palette.mode === 'dark' 
    ? theme.palette.primary.contrastText
    : theme.palette.primary.contrastText,
  transition: theme.transitions.create(['color'], {
    duration: theme.transitions.duration.short,
  }),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
  },
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.08)',
  },
  '& .MuiSvgIcon-root': {
    transition: theme.transitions.create(['transform'], {
      duration: theme.transitions.duration.short,
    }),
  },
  '&:hover .MuiSvgIcon-root': {
    transform: 'rotate(30deg)',
  },
}));

const Header = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        width: '100%',
        px: 2,
        transition: (theme) => theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.short,
        }),
      }}
    >
      <TitleTypography variant="h6" noWrap component="div">
        Yemen Market Analysis Dashboard
      </TitleTypography>
      
      <StyledIconButton
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'switch to light mode' : 'switch to dark mode'}
        size="large"
        edge="end"
      >
        {isDarkMode ? (
          <Brightness7Icon />
        ) : (
          <Brightness4Icon />
        )}
      </StyledIconButton>
    </Box>
  );
};

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;
