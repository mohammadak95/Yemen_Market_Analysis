// src/styles/analysisStyles.js

import { alpha } from '@mui/material/styles';

export const analysisStyles = (theme) => ({
  root: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(4),
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: { xs: 'column', sm: 'row' },
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(4),
  },
  title: {
    fontFamily: '"Merriweather", serif',
    fontWeight: 700,
    fontSize: '1.75rem',
    color: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.palette.text.secondary,
    fontSize: '1rem',
    marginBottom: theme.spacing(2),
  },
  infoIcon: {
    color: theme.palette.info.main,
    '&:hover': {
      color: theme.palette.info.dark,
    },
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: theme.spacing(2),
    alignItems: 'center',
    marginTop: { xs: theme.spacing(2), sm: 0 },
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.background.default, 0.5),
    borderRadius: theme.shape.borderRadius,
  },
  toggleGroup: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    '& .MuiToggleButton-root': {
      padding: '8px 16px',
      border: `1px solid ${theme.palette.divider}`,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        fontWeight: 600,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      },
    },
  },
  downloadButton: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  resultsContainer: {
    marginTop: theme.spacing(4),
  },
  sectionTitle: {
    fontFamily: '"Merriweather", serif',
    color: theme.palette.primary.main,
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: theme.spacing(3),
    paddingBottom: theme.spacing(1),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  insightCard: {
    padding: theme.spacing(3),
    height: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    transition: 'box-shadow 0.3s ease-in-out',
    '&:hover': {
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    },
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    '& .MuiSvgIcon-root': {
      fontSize: '2rem',
      color: theme.palette.primary.main,
    },
  },
  insightValue: {
    color: theme.palette.primary.main,
    fontWeight: 700,
    fontSize: '2rem',
    marginBottom: theme.spacing(1),
  },
  chartPaper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(4),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  chartTitle: {
    fontFamily: '"Merriweather", serif',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
  },
  chartDescription: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.background.default, 0.5),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  interpretationGuide: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: alpha(theme.palette.info.main, 0.03),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
  },
  methodologyNote: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: alpha(theme.palette.background.default, 0.5),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  alert: {
    marginBottom: theme.spacing(2),
    '& .MuiAlert-icon': {
      fontSize: '1.5rem',
    },
  },
  divider: {
    margin: theme.spacing(4, 0),
  },
});

export const chartStyles = (theme) => ({
  chartContainer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  tooltip: {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[2],
  },
});
