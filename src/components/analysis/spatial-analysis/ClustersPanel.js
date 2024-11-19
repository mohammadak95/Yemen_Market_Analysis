// src/components/analysis/spatial-analysis/ClustersPanel.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Paper, List, ListItem, ListItemText } from '@mui/material';

const ClustersPanel = ({ clustersData }) => {
  return (
    <Box>
      {clustersData && clustersData.length > 0 ? (
        clustersData.map((cluster, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">Cluster {cluster.cluster_id}</Typography>
            <Typography variant="body2">
              Main Market: {cluster.main_market}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Connected Markets:
            </Typography>
            <List dense>
              {cluster.connected_markets.map((market, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={market} />
                </ListItem>
              ))}
            </List>
          </Paper>
        ))
      ) : (
        <Typography>No market clusters identified.</Typography>
      )}
    </Box>
  );
};

ClustersPanel.propTypes = {
  clustersData: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      main_market: PropTypes.string.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
};

export default ClustersPanel;