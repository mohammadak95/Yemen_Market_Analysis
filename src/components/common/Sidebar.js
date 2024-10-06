// src/components/common/Sidebar.js
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const SidebarContainer = styled.aside`
  width: 250px;
  background-color: ${props => props.theme.sidebarBackground};
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.borderColor};
  background-color: ${props => props.theme.backgroundColor};
  color: ${props => props.theme.textColor};
`;

const Sidebar = ({
  commodities,
  regimes,
  selectedCommodity,
  setSelectedCommodity,
  selectedRegime,
  setSelectedRegime,
}) => {
  return (
    <SidebarContainer>
      <h2>Filters</h2>
      <Select
        value={selectedCommodity}
        onChange={(e) => setSelectedCommodity(e.target.value)}
      >
        <option value="">Select Commodity</option>
        {commodities && commodities.map((commodity) => (
          <option key={commodity} value={commodity}>
            {commodity}
          </option>
        ))}
      </Select>
      <Select
        value={selectedRegime}
        onChange={(e) => setSelectedRegime(e.target.value)}
      >
        <option value="">Select Regime</option>
        {regimes && regimes.map((regime) => (
          <option key={regime} value={regime}>
            {regime}
          </option>
        ))}
      </Select>
    </SidebarContainer>
  );
};

Sidebar.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string),
  regimes: PropTypes.arrayOf(PropTypes.string),
  selectedCommodity: PropTypes.string,
  setSelectedCommodity: PropTypes.func.isRequired,
  selectedRegime: PropTypes.string,
  setSelectedRegime: PropTypes.func.isRequired,
};

Sidebar.defaultProps = {
  commodities: [],
  regimes: [],
  selectedCommodity: '',
  selectedRegime: '',
};

export default Sidebar;