//src/components/common/RegimeSelector.js

import React from 'react';
import PropTypes from 'prop-types';

const RegimeSelector = ({ regimes, selectedRegime, onSelectRegime }) => {
  if (!regimes || regimes.length === 0) {
    return <div>No regimes available</div>;
  }

  return (
    <div>
      <label htmlFor="regime-select">Select Regime: </label>
      <select 
        id="regime-select"
        value={selectedRegime} 
        onChange={(e) => onSelectRegime(e.target.value)}
      >
        <option value="">Select a regime</option>
        {regimes.map((regime) => (
          <option key={regime} value={regime}>
            {regime}
          </option>
        ))}
      </select>
    </div>
  );
};

RegimeSelector.propTypes = {
  regimes: PropTypes.arrayOf(PropTypes.string),
  selectedRegime: PropTypes.string,
  onSelectRegime: PropTypes.func.isRequired,
};

export default RegimeSelector;