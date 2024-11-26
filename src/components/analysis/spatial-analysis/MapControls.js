// src/components/analysis/spatial-analysis/MapControls.js

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { setVisualizationMode } from '../../../slices/spatialSlice';
import { VISUALIZATION_MODES } from '../../../constants';
import { selectVisualizationMode } from '../../../selectors/optimizedSelectors';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const MapControls = ({ metadata }) => {
  const dispatch = useDispatch();
  const visualizationMode = useSelector(selectVisualizationMode);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl size="small">
        <InputLabel>Analysis Type</InputLabel>
        <Select
          value={visualizationMode}
          onChange={(e) => dispatch(setVisualizationMode(e.target.value))}
          label="Analysis Type"
        >
          {Object.entries(VISUALIZATION_MODES).map(([key, value]) => (
            <MenuItem key={key} value={value}>
              {key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="Select the type of analysis to display on the map">
        <IconButton size="small">
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>

      {metadata && (
        <Box sx={{ ml: 'auto', typography: 'body2', color: 'text.secondary' }}>
          Last Updated: {new Date(metadata.timestamp).toLocaleString()}
        </Box>
      )}
    </Box>
  );
};

export default React.memo(MapControls);