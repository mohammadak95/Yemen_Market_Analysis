// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper } from '@mui/material';

const DynamicInterpretation = ({ data }) => {
  if (!data || !data.moran_i) {
    return <div>No interpretation available</div>;
  }

  const { moran_i, r_squared } = data;

  let interpretation = 'Based on the spatial analysis, ';

  if (moran_i['p-value'] < 0.05) {
    interpretation += `there is significant spatial autocorrelation (Moran's I: ${moran_i.I.toFixed(2)}), indicating that similar price patterns are clustered geographically. `;
  } else {
    interpretation += 'no significant spatial autocorrelation was detected, suggesting a random spatial distribution of prices. ';
  }

  interpretation += `The model explains ${(r_squared * 100).toFixed(2)}% of the variance, which indicates ${
    r_squared > 0.5 ? 'a strong' : 'a moderate'
  } relationship between the variables.`;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="body1">{interpretation}</Typography>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }).isRequired,
    r_squared: PropTypes.number.isRequired,
  }).isRequired,
};

export default DynamicInterpretation;
