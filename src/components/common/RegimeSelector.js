// sr./components/common/RegimeSelector.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Typography,
} from '@mui/material';
import { capitalizeWords } from '../../utils/appUtils';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const RegimeSelector = ({ regimes, selectedRegimes, onSelectRegimes }) => {
  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="regime-select-label">
        Select Regimes
      </InputLabel>
      <Select
        labelId="regime-select-label"
        id="regime-select"
        name="regimes"
        multiple
        value={selectedRegimes}
        onChange={(e) => onSelectRegimes(e.target.value)}
        label="Select Regimes"
        aria-label="Select regimes"
        renderValue={(selected) => selected.map(regime => capitalizeWords(regime)).join(', ')}
      >
        {regimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            <Checkbox
              id={`regime-checkbox-${regime}`}
              checked={selectedRegimes.indexOf(regime) > -1}
            />
            <ListItemText primary={capitalizeWords(regime)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

RegimeSelector.propTypes = {
  regimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectRegimes: PropTypes.func.isRequired,
};

export default RegimeSelector;