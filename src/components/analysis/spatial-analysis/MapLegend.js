import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Tooltip,
  IconButton,
  Divider,
  Collapse,
  Stack,
  useTheme
} from '@mui/material';
import {
  Info,
  ExpandMore,
  ExpandLess,
  Circle,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import { interpolateRgb } from 'd3-interpolate';

const MapLegend = ({
  title,
  colorScale,
  steps = 7,
  unit = '',
  description = '',
  position = 'bottomright',
  statistics = null,
  domain = null,
  mode = 'continuous',
  categories = null
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  const legendData = useMemo(() => {
    // Define the color scale domain based on provided domain or statistics data
    let computedDomain;
    
    if (mode === 'categorical' && categories) {
      // Set domain based on categorical categories
      return categories.map(category => ({
        label: category.label,
        color: category.color
      }));
    } else {
      // Continuous scale: Calculate domain based on provided statistics or custom domain
      computedDomain = domain || [
        statistics?.min || 0,
        statistics?.max || 1
      ];

      // Calculate range and step size for gradient scale
      const range = computedDomain[1] - computedDomain[0];
      const stepSize = range / (steps - 1);

      return Array.from({ length: steps }, (_, i) => ({
        value: computedDomain[0] + stepSize * i,
        color: colorScale(computedDomain[0] + stepSize * i)
      }));
    }
  }, [colorScale, steps, mode, categories, domain, statistics]);

  const formatValue = (value) => {
    if (typeof value !== 'number') return value;
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
        minWidth: 200,
        maxWidth: 300,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2">{title}</Typography>
          {description && (
            <Tooltip title={description} arrow placement="top">
              <Info fontSize="small" color="action" />
            </Tooltip>
          )}
        </Stack>
        <IconButton 
          size="small" 
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ p: 0.5 }}
        >
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        {/* Color Scale */}
        {mode === 'continuous' ? (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', height: 20 }}>
              {legendData.map((item, i) => (
                <Tooltip
                  key={i}
                  title={`${formatValue(item.value)}${unit}`}
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      flex: 1,
                      bgcolor: item.color,
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption">
                {formatValue(legendData[0].value)}
                {unit}
              </Typography>
              <Typography variant="caption">
                {formatValue(legendData[legendData.length - 1].value)}
                {unit}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            {legendData.map((category, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: category.color,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="caption">
                  {category.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {/* Statistics */}
        {statistics && (
          <>
            <Divider sx={{ my: 1 }} />
            <Stack spacing={0.5}>
              {Object.entries(statistics).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {key}:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {typeof value === 'number' && (
                      <Box
                        component="span"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: value > 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {value > 0 ? <TrendingUp fontSize="small" /> : <Warning fontSize="small" />}
                      </Box>
                    )}
                    <Typography variant="caption">
                      {typeof value === 'number' ? formatValue(value) + unit : value}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Collapse>
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
  domain: PropTypes.arrayOf(PropTypes.number),
  mode: PropTypes.oneOf(['continuous', 'categorical']),
  categories: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    value: PropTypes.any
  }))
};

export default React.memo(MapLegend);