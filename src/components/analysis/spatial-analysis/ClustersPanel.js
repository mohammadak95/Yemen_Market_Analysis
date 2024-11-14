// src/components/analysis/spatial-analysis/ClustersPanel.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Paper } from '@mui/material';

const ClustersPanel = ({ clustersData }) => {
  return (
    <Box>
      {clustersData.length > 0 ? (
        clustersData.map((cluster, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">Cluster {index + 1}</Typography>
            <Typography variant="body2">
              Main Market: {cluster.main_market}
            </Typography>
            <Typography variant="body2">
              Connected Markets: {cluster.connected_markets.join(', ')}
            </Typography>
          </Paper>
        ))
      ) : (
        <Typography>No market clusters identified.</Typography>
      )}
    </Box>
  );
};

ClustersPanel.propTypes = {
  clustersData: PropTypes.array.isRequired,
};

export default ClustersPanel;