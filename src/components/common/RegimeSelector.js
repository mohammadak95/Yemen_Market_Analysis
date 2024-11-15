import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from '@mui/material';

// Import selectors for debugging
import { 
  selectSpatialStatus,
  selectSpatialData
} from '../../selectors/spatialSelectors';
import {
  selectAvailableRegimes,
  selectSelectedRegimes,
} from '../../selectors/spatialSelectors';
import { setSelectedRegimes } from '../../slices/spatialSlice';

const RegimeSelector = () => {
  const dispatch = useDispatch();
  const availableRegimes = useSelector(selectAvailableRegimes);
  const selectedRegimes = useSelector(selectSelectedRegimes);

  const handleRegimesSelect = useCallback(
    (event) => {
      const {
        target: { value },
      } = event;
      dispatch(setSelectedRegimes(typeof value === 'string' ? value.split(',') : value));
    },
    [dispatch]
  );

  // Set the first available regime as the default selection if none are selected
  useEffect(() => {
    if (selectedRegimes.length === 0 && availableRegimes.length > 0) {
      dispatch(setSelectedRegimes([availableRegimes[0]]));
    }
  }, [availableRegimes, selectedRegimes, dispatch]);

  
  // Log spatial state for debugging
  const spatialStatus = useSelector(selectSpatialStatus);
  const spatialData = useSelector(selectSpatialData);
  console.log('Spatial status:', spatialStatus);
  console.log('Spatial data:', spatialData);  
  
  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="regime-select-label">Select Regimes</InputLabel>
      <Select
        labelId="regime-select-label"
        id="regime-select"
        multiple
        value={selectedRegimes}
        onChange={handleRegimesSelect}
        label="Select Regimes"
        renderValue={(selected) =>
          selected
            .map((regime) =>
              regime
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())
            )
            .join(', ')
        }
      >
        {availableRegimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            <Checkbox checked={selectedRegimes.indexOf(regime) > -1} />
            <ListItemText
              primary={regime
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default React.memo(RegimeSelector);