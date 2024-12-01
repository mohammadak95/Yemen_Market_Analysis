// src/styles/analysisStyles.js

import { alpha } from '@mui/material/styles';

export const analysisStyles = (theme) => ({
  root: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(3),
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[3],
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: { xs: 'column', sm: 'row' },
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
    borderRadius: theme.shape.borderRadius,
  },
  title: {
    fontWeight: 700,
    fontSize: '1.5rem',
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  infoIcon: {
    color: theme.palette.primary.main,
    '&:hover': {
      color: theme.palette.primary.dark,
    },
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: theme.spacing(2),
    alignItems: 'center',
    marginTop: { xs: theme.spacing(2), sm: 0 },
  },
  contentSection: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  },
  toggleGroup: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    '& .MuiToggleButton-root': {
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 600,
      },
    },
  },
  chartContainer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: `inset 0 0 8px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  downloadButton: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: theme.spacing(2),
  },
  errorContainer: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.error.main, 0.05),
    border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
  },
  interpretationCard: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(3),
    backgroundColor: alpha(theme.palette.info.main, 0.03),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
  },
  resultsContainer: {
    marginTop: theme.spacing(2),
  },
  insightCard: {
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    borderRadius: theme.shape.borderRadius,
  },
  chartPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    borderRadius: theme.shape.borderRadius,
  },
});

// Export chartStyles separately if needed
export const chartStyles = (theme) => ({
  chartContainer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: `inset 0 0 8px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
});