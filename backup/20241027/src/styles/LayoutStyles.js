// src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const drawerWidth = 240;

export const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  flexDirection: 'row', // Default layout is row
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column', // Stack elements vertically on small screens
  },
}));

export const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

export const SidebarWrapper = styled(Box)(({ theme, open }) => ({
  width: open ? drawerWidth : 0,
  flexShrink: 0,
  transition: theme.transitions.create(['width', 'height'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    height: open ? 'auto' : 0, // Control the height on small screens
    overflow: 'hidden', // Hide content when closed
  },
}));
