// src/styles/theme.js

import { createTheme } from '@mui/material/styles';

const baseTheme = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.7,
    },
  },
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
};

// World Bank style color palette
const worldBankColors = {
  primary: {
    main: '#002244', // World Bank Blue
    light: '#003366',
    dark: '#001a33',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#009FDA', // World Bank Light Blue
    light: '#33b1e1',
    dark: '#006e98',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4C9F38', // World Bank Green
    light: '#6ab553',
    dark: '#357027',
  },
  warning: {
    main: '#F0AB00', // World Bank Yellow
    light: '#ffbe2f',
    dark: '#b88000',
  },
  error: {
    main: '#E73F3F', // World Bank Red
    light: '#eb6565',
    dark: '#c62828',
  },
  info: {
    main: '#0077BB', // World Bank Info Blue
    light: '#3391c9',
    dark: '#005282',
  },
};

// Light Theme Configuration
const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    ...worldBankColors,
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#4f4f4f',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
});

// Dark Theme Configuration
const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    ...worldBankColors,
    background: {
      default: '#1a1a1a',
      paper: '#262626',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
});

// Theme Overrides
const themeOverrides = {
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
          fontWeight: 600,
          padding: '8px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.MuiTypography-h1, &.MuiTypography-h2, &.MuiTypography-h3, &.MuiTypography-h4, &.MuiTypography-h5, &.MuiTypography-h6': {
            fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
            marginBottom: '0.5em',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: worldBankColors.primary.main,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: worldBankColors.primary.dark,
            },
          },
        },
      },
    },
  },
};

// Export Themes
export const lightThemeWithOverrides = createTheme(lightTheme, themeOverrides);
export const darkThemeWithOverrides = createTheme(darkTheme, themeOverrides);

export default lightThemeWithOverrides;
