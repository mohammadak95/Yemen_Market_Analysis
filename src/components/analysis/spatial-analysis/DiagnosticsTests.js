// src/components/DiagnosticsTests.js

import React from 'react';
import SpatialDiagnostics from './SpatialDiagnostics';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return <div>No diagnostics data available</div>;
  }

  // Extract only the diagnostics needed
  const diagnostics = {
    moran_i: data.moran_i,
    r_squared: data.r_squared,
    adj_r_squared: data.adj_r_squared,
  };

  return (
    <div>
      <SpatialDiagnostics diagnostics={diagnostics} />
    </div>
  );
};

export default DiagnosticsTests;
