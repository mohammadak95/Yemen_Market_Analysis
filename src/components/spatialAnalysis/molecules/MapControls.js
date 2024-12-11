/**
 * Map Controls Component
 * 
 * Provides zoom and reset controls for the map visualization
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RefreshIcon from '@mui/icons-material/Refresh';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';

const MapControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onRefresh,
  position = { top: 10, right: 10 }
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'absolute',
        ...position,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 2,
        '& > button': {
          borderRadius: 0,
          padding: 1,
          '&:first-of-type': {
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4
          },
          '&:last-child': {
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4
          },
          '&:not(:last-child)': {
            borderBottom: `1px solid ${theme.palette.divider}`
          }
        }
      }}
    >
      <IconButton 
        onClick={onZoomIn}
        title="Zoom In"
        size="small"
      >
        <AddIcon fontSize="small" />
      </IconButton>
      
      <IconButton 
        onClick={onZoomOut}
        title="Zoom Out"
        size="small"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      
      <IconButton 
        onClick={onReset}
        title="Reset View"
        size="small"
      >
        <CenterFocusStrongIcon fontSize="small" />
      </IconButton>
      
      <IconButton 
        onClick={onRefresh}
        title="Refresh Data"
        size="small"
      >
        <RefreshIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

MapControls.propTypes = {
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
  })
};

export default React.memo(MapControls);
