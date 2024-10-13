// src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Define drawer widths
export const drawerWidth = 240;

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
  padding: theme.spacing(2),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: open ? `${drawerWidth}px` : 0,
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    padding: theme.spacing(1),
  },
}));