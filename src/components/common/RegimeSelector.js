// src/components/common/RegimeSelector.js

import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const RegimeSelector = ({ regimes, selectedRegime, onSelectRegime }) => {
  if (!regimes || regimes.length === 0) {
    return <div>No regimes available</div>;
  }

  return (
    <FormControl fullWidth variant="outlined" margin="normal">
      <InputLabel id="regime-label">Regime</InputLabel>
      <Select
        labelId="regime-label"
        id="regime-select"
        value={selectedRegime}
        onChange={(e) => onSelectRegime(e.target.value)}
        label="Regime"
      >
        <MenuItem value="">
          <em>Select a regime</em>
        </MenuItem>
        {regimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            {regime}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

RegimeSelector.propTypes = {
  regimes: PropTypes.arrayOf(PropTypes.string),
  selectedRegime: PropTypes.string,
  onSelectRegime: PropTypes.func.isRequired,
};

export default RegimeSelector;