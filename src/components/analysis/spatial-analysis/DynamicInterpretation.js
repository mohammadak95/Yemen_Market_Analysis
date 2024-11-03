// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Alert } from '@mui/material';

const DynamicInterpretation = ({ data }) => {
  if (!data || !data.moran_i) {
    return (
      <Alert severity="info">
        No interpretation available
      </Alert>
    );
  }

  const { moran_i, r_squared } = data;

  const moranIValue = moran_i.I || moran_i.value;
  const pValue = moran_i['p-value'] || moran_i.p_value;

  if (moranIValue === undefined || pValue === undefined) {
    return (
      <Alert severity="warning">
        Insufficient data for interpretation.
      </Alert>
    );
  }

  let interpretation = 'Based on the spatial analysis, ';

  if (pValue < 0.05) {
    interpretation += `there is significant spatial autocorrelation (Moran's I: ${moranIValue.toFixed(2)}), indicating that similar price patterns are clustered geographically. `;
  } else {
    interpretation += 'no significant spatial autocorrelation was detected, suggesting a random spatial distribution of prices. ';
  }

  if (r_squared !== undefined) {
    interpretation += ` The model explains ${(r_squared * 100).toFixed(2)}% of the variance, indicating a ${
      r_squared > 0.5 ? 'strong' : 'moderate'
    } relationship between the variables.`;
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="body1">{interpretation}</Typography>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      value: PropTypes.number,
      'p-value': PropTypes.number,
      p_value: PropTypes.number,
    }),
    r_squared: PropTypes.number,
  }),
};

export default DynamicInterpretation;
