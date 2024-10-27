// sr./components/common/CommoditySelector.js

import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { capitalizeWords } from '../../utils/utils';

const CommoditySelector = ({ commodities, selectedCommodity, onSelectCommodity }) => {
  if (!commodities || commodities.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No commodities available
      </Typography>
    );
  }

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
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