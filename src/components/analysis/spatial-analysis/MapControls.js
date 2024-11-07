// src/components/analysis/spatial-analysis/MapControls.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

const MapControls = ({
  selectedCommodity,
  selectedDate,
  uniqueMonths,
  commodities,
  onCommodityChange,
  onDateChange,
  onRefresh,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <FormControl variant="outlined" sx={{ minWidth: 150, mr: 2 }}>
        <InputLabel>Commodity</InputLabel>
        <Select
          value={selectedCommodity}
          onChange={(e) => onCommodityChange(e.target.value)}
          label="Commodity"
        >
          {commodities.map((commodity) => (
            <MenuItem key={commodity} value={commodity}>
              {commodity}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl variant="outlined" sx={{ minWidth: 150, mr: 2 }}>
        <InputLabel>Date</InputLabel>
        <Select
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          label="Date"
        >
          {uniqueMonths.map((month) => (
            <MenuItem key={month} value={month}>
              {new Date(month).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="Refresh Data">
        <IconButton onClick={onRefresh} color="primary">
          <Refresh />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

MapControls.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string.isRequired,
  uniqueMonths: PropTypes.arrayOf(PropTypes.string).isRequired,
  commodities: PropTypes.arrayOf(PropTypes.string).isRequired,
  onCommodityChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default MapControls;