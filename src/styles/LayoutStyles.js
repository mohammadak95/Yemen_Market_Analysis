// src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Define drawer widths
export const drawerWidth = 240;
export const collapsedDrawerWidth = 60; // Width when the sidebar is collapsed

// Container for the entire layout
export const LayoutContainer = styled(Box)(() => ({
  display: 'flex',
  minHeight: '100vh',
}));

// Main content area that shifts based on the sidebar's open state
export const MainContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));