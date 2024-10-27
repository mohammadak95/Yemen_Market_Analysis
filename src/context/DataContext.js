// src/contexts/DataContext.js

import React, { createContext, useState } from 'react';
import PropTypes from 'prop-types';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [selectedCommodity, setSelectedCommodity] = useState('Wheat');

  return (
    <DataContext.Provider value={{ selectedCommodity, setSelectedCommodity }}>
      {children}
    </DataContext.Provider>
  );
};

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
