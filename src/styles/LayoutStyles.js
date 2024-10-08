// src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { drawerWidth, collapsedDrawerWidth } from '../utils/layout';

// Layout Container using Flexbox
export const LayoutContainer = styled(Box)(() => ({
  display: 'flex',
  minHeight: '100vh', // Ensures the container covers the viewport height
}));

// Main Content Area
export const MainContent = styled(Box)(({ theme, sidebarOpen }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
  marginLeft: sidebarOpen ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  width: `calc(100% - ${sidebarOpen ? drawerWidth : collapsedDrawerWidth}px)`,
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    width: '100%',
  },
  overflowY: 'auto', // Enables vertical scrolling when content overflows
}));
