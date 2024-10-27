// src/components/AnalysisWrapper.js

import React from 'react';
import PropTypes from 'prop-types';

const AnalysisWrapper = ({ children }) => {
  return <>{children}</>; // Simply render children without additional wrappers or transitions
};

AnalysisWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AnalysisWrapper;