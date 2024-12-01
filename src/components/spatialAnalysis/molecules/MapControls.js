import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RefreshIcon from '@mui/icons-material/Refresh';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LayersIcon from '@mui/icons-material/Layers';
import StraightenIcon from '@mui/icons-material/Straighten';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import PinDropIcon from '@mui/icons-material/PinDrop';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

const MapControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onRefresh,
  onLayerToggle,
  onMeasureStart,
  onMeasureEnd,
  onFullscreen,
  onMapTypeChange,
  availableLayers = [],
  activeLayers = [],
  mapTypes = ['standard', 'satellite', 'terrain'],
  currentMapType = 'standard',
  measurementMode = false,
  disabled = false
}) => {
  const [layerMenuAnchor, setLayerMenuAnchor] = useState(null);
  const [mapTypeMenuAnchor, setMapTypeMenuAnchor] = useState(null);
  const [measureMenuAnchor, setMeasureMenuAnchor] = useState(null);

  // Layer Menu Handlers
  const handleLayerMenuOpen = (event) => setLayerMenuAnchor(event.currentTarget);
  const handleLayerMenuClose = () => setLayerMenuAnchor(null);

  // Map Type Menu Handlers
  const handleMapTypeMenuOpen = (event) => setMapTypeMenuAnchor(event.currentTarget);
  const handleMapTypeMenuClose = () => setMapTypeMenuAnchor(null);

  // Measurement Menu Handlers
  const handleMeasureMenuOpen = (event) => setMeasureMenuAnchor(event.currentTarget);
  const handleMeasureMenuClose = () => setMeasureMenuAnchor(null);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        display: 'flex',
        flexDirection: 'column',
        '& > *': {
          m: 0.5
        }
      }}
    >
      {/* Zoom Controls */}
      <Box>
        <Tooltip title="Zoom In">
          <span>
            <IconButton size="small" onClick={onZoomIn} disabled={disabled}>
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Zoom Out">
          <span>
            <IconButton size="small" onClick={onZoomOut} disabled={disabled}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider />

      {/* View Controls */}
      <Box>
        <Tooltip title="Reset View">
          <span>
            <IconButton size="small" onClick={onReset} disabled={disabled}>
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Current Location">
          <span>
            <IconButton size="small" onClick={() => {}} disabled={disabled}>
              <MyLocationIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider />

      {/* Layer Controls */}
      <Box>
        <Tooltip title="Map Layers">
          <span>
            <IconButton size="small" onClick={handleLayerMenuOpen} disabled={disabled}>
              <LayersIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Menu
          anchorEl={layerMenuAnchor}
          open={Boolean(layerMenuAnchor)}
          onClose={handleLayerMenuClose}
        >
          {availableLayers.map(layer => (
            <MenuItem key={layer.id}>
              <ListItemIcon>
                <Switch
                  size="small"
                  checked={activeLayers.includes(layer.id)}
                  onChange={() => {
                    onLayerToggle(layer.id);
                    handleLayerMenuClose();
                  }}
                />
              </ListItemIcon>
              <ListItemText primary={layer.name} />
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Map Type">
          <span>
            <IconButton size="small" onClick={handleMapTypeMenuOpen} disabled={disabled}>
              <MapIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Menu
          anchorEl={mapTypeMenuAnchor}
          open={Boolean(mapTypeMenuAnchor)}
          onClose={handleMapTypeMenuClose}
        >
          {mapTypes.map(type => (
            <MenuItem 
              key={type}
              selected={type === currentMapType}
              onClick={() => {
                onMapTypeChange(type);
                handleMapTypeMenuClose();
              }}
            >
              <ListItemText primary={type.charAt(0).toUpperCase() + type.slice(1)} />
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Divider />

      {/* Measurement Tools */}
      <Box>
        <Tooltip title="Measurement Tools">
          <span>
            <IconButton size="small" onClick={handleMeasureMenuOpen} disabled={disabled}>
              <StraightenIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Menu
          anchorEl={measureMenuAnchor}
          open={Boolean(measureMenuAnchor)}
          onClose={handleMeasureMenuClose}
        >
          <MenuItem onClick={() => {
            onMeasureStart('distance');
            handleMeasureMenuClose();
          }}>
            <ListItemIcon>
              <TimelineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Measure Distance" />
          </MenuItem>
          <MenuItem onClick={() => {
            onMeasureStart('area');
            handleMeasureMenuClose();
          }}>
            <ListItemIcon>
              <SquareFootIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Measure Area" />
          </MenuItem>
          <MenuItem onClick={() => {
            onMeasureStart('point');
            handleMeasureMenuClose();
          }}>
            <ListItemIcon>
              <PinDropIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Place Point" />
          </MenuItem>
        </Menu>

        {measurementMode && (
          <Tooltip title="End Measurement">
            <span>
              <IconButton 
                size="small" 
                onClick={onMeasureEnd}
                color="secondary"
                disabled={disabled}
              >
                <StraightenIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Divider />

      {/* Additional Controls */}
      <Box>
        <Tooltip title="Refresh Data">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={disabled}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Fullscreen">
          <span>
            <IconButton size="small" onClick={onFullscreen} disabled={disabled}>
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

MapControls.propTypes = {
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onLayerToggle: PropTypes.func,
  onMeasureStart: PropTypes.func,
  onMeasureEnd: PropTypes.func,
  onFullscreen: PropTypes.func,
  onMapTypeChange: PropTypes.func,
  availableLayers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })),
  activeLayers: PropTypes.arrayOf(PropTypes.string),
  mapTypes: PropTypes.arrayOf(PropTypes.string),
  currentMapType: PropTypes.string,
  measurementMode: PropTypes.bool,
  disabled: PropTypes.bool
};

export default React.memo(MapControls);
