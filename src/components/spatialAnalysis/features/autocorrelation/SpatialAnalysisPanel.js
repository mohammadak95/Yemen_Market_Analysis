import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  Grid,
  Alert,
  Button,
  Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const UnderDevelopmentMessage = () => (
  <Alert severity="info" sx={{ mt: 2 }}>
    <Typography variant="subtitle1" gutterBottom>
      Under Development
    </Typography>
    <Typography variant="body2">
      This component is currently under development. Please check back later for updates.
    </Typography>
  </Alert>
);

const SpatialAnalysisPanel = ({
  global,
  local,
  selectedRegion,
  clusters,
  spatialMetrics
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [showDetails, setShowDetails] = useState(false);

  // Format values for display
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  // Get selected metrics
  const selectedMetrics = selectedRegion ? local[selectedRegion] : null;

  return (
    <Box>
      <Button
        fullWidth
        onClick={() => setShowDetails(!showDetails)}
        endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 2 }}
      >
        {showDetails ? 'Hide Details' : 'View Details'}
      </Button>

      <Collapse in={showDetails}>
        <UnderDevelopmentMessage />
      </Collapse>
    </Box>
  );
};

export default React.memo(SpatialAnalysisPanel);
