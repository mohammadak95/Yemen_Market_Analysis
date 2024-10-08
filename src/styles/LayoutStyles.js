//src/styles/LayoutStyles.js

import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { makeStyles } from '@mui/styles';

const drawerWidth = 240;

export const LayoutContainer = styled(Box)(() => ({
  display: 'flex',
  minHeight: '100vh',
}));

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

export const useLayoutStylesWithTheme = makeStyles((theme) => ({
  appBar: {
    zIndex: theme.zIndex?.drawer ? theme.zIndex.drawer + 1 : 1200,
    transition: theme.transitions?.create(['width', 'margin'], {
      easing: theme.transitions?.easing?.sharp,
      duration: theme.transitions?.duration?.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions?.create(['width', 'margin'], {
      easing: theme.transitions?.easing?.sharp,
      duration: theme.transitions?.duration?.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing?.(0, 1) || '0 8px',
    // necessary for content to be below app bar
    ...theme.mixins?.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing?.(3) || '24px',
  },
}));