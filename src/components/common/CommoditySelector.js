// sr./components/common/CommoditySelector.js

import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { capitalizeWords } from '../../utils/appUtils';

const CommoditySelector = ({ commodities, selectedCommodity, onSelectCommodity }) => {
  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="commodity-select-label">
        Select Commodity
      </InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        name="commodity"
        value={selectedCommodity}
        onChange={(e) => onSelectCommodity(e.target.value)}
        label="Select Commodity"
        aria-label="Select commodity"
      >
        <MenuItem value="">
          <em>Select a commodity</em>
        </MenuItem>
        {commodities.map((commodity) => (
          <MenuItem key={commodity} value={commodity}>
            {capitalizeWords(commodity)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

CommoditySelector.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  onSelectCommodity: PropTypes.func.isRequired,
};

export default CommoditySelector;