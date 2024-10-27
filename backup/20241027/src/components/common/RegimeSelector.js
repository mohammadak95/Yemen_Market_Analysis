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
import { capitalizeWords } from '../../utils/utils';

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
  if (!regimes || regimes.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No regimes available
      </Typography>
    );
  }

  const handleChange = (event) => {
    const value = event.target.value;
    onSelectRegimes(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="regime-selector-label">Regimes for Graph</InputLabel>
      <Select
        labelId="regime-selector-label"
        id="regime-selector"
        multiple
        value={selectedRegimes}
        onChange={handleChange}
        input={<OutlinedInput label="Regimes for Graph" />}
        renderValue={(selected) =>
          selected.map((regime) => capitalizeWords(regime)).join(', ')
        }
        MenuProps={MenuProps}
      >
        {regimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            <Checkbox checked={selectedRegimes.indexOf(regime) > -1} />
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