//src/components/common/CommoditySelector.js

import React from 'react';
import PropTypes from 'prop-types';

const CommoditySelector = ({ commodities, selectedCommodity, onSelectCommodity }) => {
  if (!commodities || commodities.length === 0) {
    return <div>No commodities available</div>;
  }

  return (
    <div>
      <label htmlFor="commodity-select">Select Commodity: </label>
      <select 
        id="commodity-select"
        value={selectedCommodity} 
        onChange={(e) => onSelectCommodity(e.target.value)}
      >
        <option value="">Select a commodity</option>
        {commodities.map((commodity) => (
          <option key={commodity} value={commodity}>
            {commodity}
          </option>
        ))}
      </select>
    </div>
  );
};

CommoditySelector.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string),
  selectedCommodity: PropTypes.string,
  onSelectCommodity: PropTypes.func.isRequired,
};

export default CommoditySelector;