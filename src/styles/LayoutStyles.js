// src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const drawerWidth = 240;

export const LayoutContainer = styled(Box)(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

export const MainContent = styled('main')(( ) => ({
  flexGrow: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

export const SidebarWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? drawerWidth : 0,
  flexShrink: 0,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));