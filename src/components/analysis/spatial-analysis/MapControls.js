// src/components/analysis/spatial-analysis/MapControls.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, IconButton, Tooltip } from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  Home, 
  Layers 
} from 'lucide-react';
import { useMap } from 'react-leaflet';

export const MapControls = ({ position = 'topright' }) => {
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

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        [position]: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1,
      }}
    >
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
      
      <Tooltip title="Toggle Layers" placement="left">
        <IconButton size="small">
          <Layers size={20} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

MapControls.propTypes = {
  position: PropTypes.oneOf(['topleft', 'topright', 'bottomleft', 'bottomright']),
};

export default MapControls;