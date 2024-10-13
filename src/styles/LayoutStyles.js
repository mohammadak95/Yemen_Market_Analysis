//src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const drawerWidth = 240;

export const LayoutContainer = styled(Box)(( ) => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

export const MainContent = styled('main', {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  flexGrow: 1,
  marginLeft: open && theme.breakpoints.up('sm') ? `${drawerWidth}px` : 0,
  transition: theme.transitions.create(['margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

export const SidebarWrapper = styled(Box)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));