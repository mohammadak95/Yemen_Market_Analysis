// src/components/analysis/spatial-analysis/ShocksPanel.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Paper } from '@mui/material';

const ShocksPanel = ({ shocksData }) => {
  return (
    <Box>
      {shocksData && shocksData.length > 0 ? (
        shocksData.map((shock, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">
              Shock on {new Date(shock.date).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">Magnitude: {shock.magnitude}</Typography>
            <Typography variant="body2">Type: {shock.type}</Typography>
            <Typography variant="body2">Severity: {shock.severity}</Typography>
          </Paper>
        ))
      ) : (
        <Typography>No shocks detected during the selected period.</Typography>
      )}
    </Box>
  );
};

ShocksPanel.propTypes = {
  shocksData: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      magnitude: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      severity: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default ShocksPanel;