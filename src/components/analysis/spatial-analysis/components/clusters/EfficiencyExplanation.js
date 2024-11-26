// src/components/analysis/spatial-analysis/components/clusters/EfficiencyExplanation.js

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const EfficiencyExplanation = () => {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Understanding Cluster Efficiency Metrics
      </Typography>
      <Box>
        <Typography variant="subtitle1">Internal Connectivity</Typography>
        <Typography variant="body2" paragraph>
          Measures the proportion of actual connections between markets within the cluster to the total possible connections. A higher value indicates a well-connected cluster.
        </Typography>

        <Typography variant="subtitle1">Market Coverage</Typography>
        <Typography variant="body2" paragraph>
          Represents the fraction of markets within the cluster compared to the total number of markets. It indicates the cluster's reach within the market landscape.
        </Typography>

        <Typography variant="subtitle1">Price Convergence</Typography>
        <Typography variant="body2" paragraph>
          Assesses the uniformity of prices across markets in the cluster. A higher value suggests that prices are similar, indicating efficient market integration.
        </Typography>

        <Typography variant="subtitle1">Stability</Typography>
        <Typography variant="body2" paragraph>
          Evaluates the consistency of market conditions over time. It is derived from the average volatility of market prices within the cluster.
        </Typography>

        <Typography variant="subtitle1">Efficiency Score</Typography>
        <Typography variant="body2">
          A composite metric calculated as the average of the above metrics. It provides an overall assessment of the cluster's efficiency.
        </Typography>
      </Box>
    </Paper>
  );
};

export default EfficiencyExplanation;