// src/components/analysis/spatial-analysis/MapLegend.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Info, ExpandMore, ExpandLess } from '@mui/icons-material';

const MapLegend = ({
  colorScale,
  variable,
  position = 'bottomright',
  format = (value) => value.toFixed(1),
  steps = 5,
  expanded = true,
  unit = '',
  description = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  if (!colorScale) return null;

  const domain = colorScale.domain();
  const range = domain[1] - domain[0];
  const step = range / (steps - 1);
  const values = Array.from({ length: steps }, (_, i) => domain[0] + step * i);

  const getPositionStyle = () => {
    const styles = {
      position: 'absolute',
      zIndex: 1000,
    };

    if (position.includes('top')) {
      styles.top = 10;
    } else {
      styles.bottom = 10;
    }

    if (position.includes('left')) {
      styles.left = 10;
    } else {
      styles.right = 10;
    }

    return styles;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        bgcolor: 'background.paper',
        ...getPositionStyle(),
        borderRadius: 1,
        maxWidth: 250,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" fontWeight="medium">
            {variable}
          </Typography>
          {description && (
            <Tooltip title={description} arrow>
              <Info fontSize="small" />
            </Tooltip>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ p: 0.5 }}
        >
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ display: 'flex', height: 20, mb: 0.5 }}>
          {values.map((value, i) => (
            <Tooltip
              key={i}
              title={`${format(value)}${unit}`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  width: 24,
                  height: '100%',
                  bgcolor: colorScale(value),
                  border: '1px solid',
                  borderColor: 'divider',
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 0.5,
            px: 0.5,
          }}
        >
          <Typography variant="caption">
            {format(domain[0])}
            {unit}
          </Typography>
          <Typography variant="caption">
            {format(domain[1])}
            {unit}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

MapLegend.propTypes = {
  colorScale: PropTypes.func.isRequired,
  variable: PropTypes.string.isRequired,
  position: PropTypes.oneOf([
    'topleft',
    'topright',
    'bottomleft',
    'bottomright',
  ]),
  format: PropTypes.func,
  steps: PropTypes.number,
  expanded: PropTypes.bool,
  unit: PropTypes.string,
  description: PropTypes.string,
};

export default MapLegend;