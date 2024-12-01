// Common styles for spatial analysis components
const spatialAnalysisStyles = (theme) => ({
  // Layout styles
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  
  content: {
    flexGrow: 1,
    overflow: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default
  },

  // Map container styles
  mapContainer: {
    height: '100%',
    minHeight: 400,
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    '& .leaflet-container': {
      height: '100%',
      width: '100%',
      borderRadius: 'inherit'
    }
  },

  // Card styles
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: theme.transitions.create(['box-shadow']),
    '&:hover': {
      boxShadow: theme.shadows[4]
    }
  },

  // Metric styles
  metricCard: {
    padding: theme.spacing(2),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },

  metricValue: {
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.primary
  },

  metricTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.5)
  },

  // Chart styles
  chart: {
    width: '100%',
    height: 400,
    '& .recharts-wrapper': {
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius
    }
  },

  // Table styles
  table: {
    '& .MuiTableCell-head': {
      backgroundColor: theme.palette.background.default,
      fontWeight: theme.typography.fontWeightMedium
    },
    '& .MuiTableRow-root:hover': {
      backgroundColor: theme.palette.action.hover
    }
  },

  // Control panel styles
  controlPanel: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2]
  },

  // Legend styles
  legend: {
    position: 'absolute',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1.5),
    boxShadow: theme.shadows[2]
  },

  // Tooltip styles
  tooltip: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
    border: `1px solid ${theme.palette.divider}`
  },

  // Analysis panel styles
  analysisPanel: {
    padding: theme.spacing(2),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
  },

  // Network graph styles
  networkGraph: {
    width: '100%',
    height: '100%',
    minHeight: 400,
    '& svg': {
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius
    }
  },

  // Flow line styles
  flowLine: {
    stroke: theme.palette.primary.main,
    strokeWidth: 2,
    strokeOpacity: 0.6,
    '&:hover': {
      strokeOpacity: 0.8,
      strokeWidth: 3
    }
  },

  // Market point styles
  marketPoint: {
    fill: theme.palette.primary.main,
    stroke: theme.palette.background.paper,
    strokeWidth: 2,
    '&:hover': {
      fill: theme.palette.primary.dark
    }
  },

  // Animation
  fadeIn: {
    animation: `$fadeIn 0.3s ${theme.transitions.easing.easeInOut}`
  },

  '@keyframes fadeIn': {
    from: {
      opacity: 0
    },
    to: {
      opacity: 1
    }
  },

  // Responsive styles
  '@media (max-width: 960px)': {
    controlPanel: {
      top: 'auto',
      bottom: theme.spacing(2),
      right: theme.spacing(2)
    },
    legend: {
      bottom: theme.spacing(2),
      left: theme.spacing(2),
      right: 'auto'
    }
  }
});

export default spatialAnalysisStyles;
