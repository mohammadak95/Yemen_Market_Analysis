// src/styles/analysisStyles.js

import { alpha } from '@mui/material/styles';

export const analysisStyles = (theme) => ({
  root: {
    marginTop: { xs: 2, sm: 4 },
    padding: { xs: 2, sm: 3 },
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '16px',
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    }
  },
  header: {
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    flexDirection: { xs: 'column', sm: 'row' },
    padding: 2,
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
    borderRadius: '8px',
  },
  title: {
    fontWeight: 700,
    fontSize: { xs: '1.5rem', sm: '2rem' },
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  infoIcon: {
    color: theme.palette.primary.main,
    '&:hover': {
      color: theme.palette.primary.dark,
    }
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 2,
    alignItems: { xs: 'stretch', sm: 'center' },
    marginTop: { xs: 2, sm: 0 },
  },
  contentSection: {
    padding: 2,
    backgroundColor: theme.palette.background.default,
    borderRadius: '8px',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  },
  toggleGroup: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '8px',
    '& .MuiToggleButton-root': {
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 600,
      }
    }
  },
  chartContainer: {
    marginTop: 3,
    padding: 2,
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    borderRadius: '8px',
    boxShadow: `inset 0 0 8px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  downloadButton: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: 2,
  },
  errorContainer: {
    padding: 3,
    borderRadius: '8px',
    backgroundColor: alpha(theme.palette.error.main, 0.05),
    border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
  },
  interpretationCard: {
    marginTop: 3,
    padding: 3,
    backgroundColor: alpha(theme.palette.info.main, 0.03),
    borderRadius: '8px',
    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
  }
});

export const chartStyles = {
  tooltip: {
    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.95),
    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    borderRadius: '6px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  }
};
