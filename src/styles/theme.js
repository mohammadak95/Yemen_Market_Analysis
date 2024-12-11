// src/styles/theme.js

import { createTheme, alpha } from '@mui/material/styles';

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
      sidebar: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#4f4f4f',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      hover: alpha('#000000', 0.04),
      selected: alpha(worldBankColors.primary.main, 0.08),
      selectedOpacity: 0.08,
      focus: alpha(worldBankColors.primary.main, 0.12),
    },
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
      sidebar: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      hover: alpha('#ffffff', 0.08),
      selected: alpha(worldBankColors.primary.light, 0.16),
      selectedOpacity: 0.16,
      focus: alpha(worldBankColors.primary.light, 0.12),
    },
  },
});

// Theme Overrides
const themeOverrides = {
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ':root': {
          '--mui-palette-primary-main': theme.palette.primary.main,
          '--mui-palette-background-paper': theme.palette.background.paper,
          '--mui-palette-background-default': theme.palette.background.default,
          '--mui-palette-text-primary': theme.palette.text.primary,
          '--mui-palette-text-secondary': theme.palette.text.secondary,
          '--mui-palette-action-hover': theme.palette.action.hover,
          '--mui-shadow-1': theme.shadows[1],
          '--mui-shadow-2': theme.shadows[2],
        },
      }),
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.background.sidebar,
          backgroundImage: 'none',
          '& .MuiDivider-root': {
            borderColor: theme.palette.divider,
          },
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity + 0.04),
            },
          },
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: ({ theme }) => ({
          color: theme.palette.text.secondary,
        }),
      },
    },
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
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        }),
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
    // Chart theme overrides
    MuiChart: {
      styleOverrides: {
        root: (theme) => ({
          '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
            stroke: theme.palette.divider,
          },
          '& .recharts-text': {
            fill: theme.palette.text.primary,
          },
          '& .recharts-legend-item-text': {
            color: theme.palette.text.primary,
          },
          '& .recharts-tooltip': {
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[2],
          },
        }),
      },
    },
  },
};

// Export Themes
export const lightThemeWithOverrides = createTheme(lightTheme, themeOverrides);
export const darkThemeWithOverrides = createTheme(darkTheme, themeOverrides);

export default lightThemeWithOverrides;
