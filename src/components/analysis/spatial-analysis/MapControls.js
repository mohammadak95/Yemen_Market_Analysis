// src/components/analysis/spatial-analysis/MapControls.js

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Paper, IconButton, Tooltip, Box, Checkbox, FormControlLabel } from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Home,
  Fullscreen,
  FullscreenExit,
  Layers, // Correctly imported Layers icon
  Refresh,
} from '@mui/icons-material';
import { useMap } from 'react-leaflet';

const MapControls = ({
  position = 'topright',
  initialZoom = 6,
  availableLayers = [],
  onLayerToggle,
}) => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerControls, setShowLayerControls] = useState(false);
  const containerRef = useRef(null);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleReset = () => {
    map.setView(map.options.center, initialZoom);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        zIndex: 1000,
        top: position.includes('top') ? 10 : 'unset',
        bottom: position.includes('bottom') ? 10 : 'unset',
        left: position.includes('left') ? 10 : 'unset',
        right: position.includes('right') ? 10 : 'unset',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 0.5,
          borderRadius: 1,
          backgroundColor: 'background.paper',
        }}
      >
        {/* Zoom Controls */}
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn} size="small">
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut} size="small">
            <ZoomOut />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset View">
          <IconButton onClick={handleReset} size="small">
            <Home />
          </IconButton>
        </Tooltip>

        {/* Fullscreen Control */}
        <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          <IconButton onClick={handleFullscreen} size="small">
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>

        {/* Layer Controls */}
        {availableLayers.length > 0 && (
          <>
            <Tooltip title="Toggle Layers">
              <IconButton
                onClick={() => setShowLayerControls(!showLayerControls)}
                size="small"
              >
                <Layers />
              </IconButton>
            </Tooltip>
            {showLayerControls && (
              <Paper
                elevation={3}
                sx={{
                  mt: 1,
                  p: 1,
                  minWidth: 150,
                  maxHeight: 200,
                  overflowY: 'auto',
                  backgroundColor: 'background.paper',
                }}
              >
                {availableLayers.map((layer) => (
                  <FormControlLabel
                    key={layer.id}
                    control={
                      <Checkbox
                        checked={layer.active}
                        onChange={() => onLayerToggle(layer.id)}
                        name={layer.name}
                        color="primary"
                      />
                    }
                    label={layer.name}
                  />
                ))}
                <Tooltip title="Refresh Layers">
                  <IconButton
                    onClick={() => window.location.reload()}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Paper>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

MapControls.propTypes = {
  position: PropTypes.oneOf([
    'topleft',
    'topright',
    'bottomleft',
    'bottomright',
  ]),
  initialZoom: PropTypes.number,
  availableLayers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      icon: PropTypes.node,
      active: PropTypes.bool,
    })
  ),
  onLayerToggle: PropTypes.func.isRequired,
};

export default MapControls;