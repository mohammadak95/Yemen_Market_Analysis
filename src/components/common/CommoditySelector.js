// src/components/common/CommoditySelector.js

import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const CommoditySelector = ({ commodities, selectedCommodity, onSelectCommodity }) => {
  if (!commodities || commodities.length === 0) {
    return <div>No commodities available</div>;
  }

  return (
    <FormControl fullWidth variant="outlined" margin="normal">
      <InputLabel id="commodity-label">Commodity</InputLabel>
      <Select
        labelId="commodity-label"
        id="commodity-select"
        value={selectedCommodity}
        onChange={(e) => onSelectCommodity(e.target.value)}
        label="Commodity"
      >
        <MenuItem value="">
          <em>Select a commodity</em>
        </MenuItem>
        {commodities.map((commodity) => (
          <MenuItem key={commodity} value={commodity}>
            {commodity}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

CommoditySelector.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string),
  selectedCommodity: PropTypes.string,
  onSelectCommodity: PropTypes.func.isRequired,
};

export default CommoditySelector;