// src/components/analysis/spatial-analysis/MapLegend.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import { Info, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const MapLegend = ({
  title,
  colorScale,
  steps = 5,
  unit = '',
  description = '',
  position = 'bottomright',
  statistics = null,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!colorScale) return null;

  // Calculate legend values with domain from colorScale
  const domain = colorScale.domain();
  const range = domain[1] - domain[0];
  const stepSize = range / (steps - 1);
  const values = Array.from({ length: steps }, (_, i) => domain[0] + stepSize * i);

  // Format numbers nicely with appropriate precision
  const formatValue = (value) => {
    if (Math.abs(value) < 0.01) return value.toExponential(2);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        [position.includes('top') ? 'top' : 'bottom']: 20,
        [position.includes('left') ? 'left' : 'right']: 20,
        p: 1.5,
        minWidth: 150,
        maxWidth: 250,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2">{title}</Typography>
          {description && (
            <Tooltip title={description} arrow placement="top">
              <Info fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
        <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)} sx={{ p: 0.5 }}>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Color Scale */}
      {isExpanded && (
        <>
          <Box sx={{ display: 'flex', height: 20, mb: 0.5 }}>
            {values.map((value, i) => (
              <Tooltip key={i} title={`${formatValue(value)}${unit}`} arrow placement="top">
                <Box
                  sx={{
                    flex: 1,
                    bgcolor: colorScale(value),
                    border: `1px solid ${theme.palette.divider}`,
                    '&:first-of-type': {
                      borderTopLeftRadius: 2,
                      borderBottomLeftRadius: 2,
                    },
                    '&:last-child': {
                      borderTopRightRadius: 2,
                      borderBottomRightRadius: 2,
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          {/* Range Labels */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
            <Typography variant="caption">
              {formatValue(domain[0])}
              {unit}
            </Typography>
            <Typography variant="caption">
              {formatValue(domain[1])}
              {unit}
            </Typography>
          </Box>

          {/* Statistics if provided */}
          {statistics && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ pt: 1 }}>
                {Object.entries(statistics).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {key}:
                    </Typography>
                    <Typography variant="caption">
                      {typeof value === 'number' ? formatValue(value) : value}
                      {unit}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </>
      )}
    </Paper>
  );
};

MapLegend.propTypes = {
  title: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
  steps: PropTypes.number,
  unit: PropTypes.string,
  description: PropTypes.string,
  position: PropTypes.oneOf(['topleft', 'topright', 'bottomleft', 'bottomright']),
  statistics: PropTypes.object,
};

export default React.memo(MapLegend);