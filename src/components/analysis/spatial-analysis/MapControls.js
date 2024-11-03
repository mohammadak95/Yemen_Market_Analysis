// src/components/analysis/spatial-analysis/MapControls.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, Home } from 'lucide-react';
import { useMap } from 'react-leaflet';

const MapControls = ({ position = 'topright' }) => {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleReset = () => {
    map.setView(map.options.center, map.options.zoom);
  };

  // Positioning styles based on the 'position' prop
  const getPositionStyle = () => {
    const styles = {
      position: 'absolute',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    };

    switch (position) {
      case 'topleft':
        styles.top = 10;
        styles.left = 10;
        break;
      case 'topright':
        styles.top = 10;
        styles.right = 10;
        break;
      case 'bottomleft':
        styles.bottom = 10;
        styles.left = 10;
        break;
      case 'bottomright':
        styles.bottom = 10;
        styles.right = 10;
        break;
      default:
        styles.top = 10;
        styles.right = 10;
    }

    return styles;
  };

  return (
    <Paper elevation={3} sx={{ p: 1, ...getPositionStyle() }}>
      <Tooltip title="Zoom In" placement="left">
        <IconButton onClick={handleZoomIn} size="small">
          <ZoomIn size={20} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Zoom Out" placement="left">
        <IconButton onClick={handleZoomOut} size="small">
          <ZoomOut size={20} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Reset View" placement="left">
        <IconButton onClick={handleReset} size="small">
          <Home size={20} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

MapControls.propTypes = {
  position: PropTypes.oneOf(['topleft', 'topright', 'bottomleft', 'bottomright']),
};

export default MapControls;
