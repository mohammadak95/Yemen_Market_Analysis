// src/components/analysis/spatial-analysis/components/conflict/ConflictMetricsPanel.js

import React from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText,
  Divider, Chip 
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const ConflictMetricsPanel = ({ metrics, selectedRegion, priceImpacts }) => {
  const selectedMetrics = selectedRegion ? 
    metrics[selectedRegion] : 
    calculateAggregateMetrics(metrics);

  const impact = priceImpacts[selectedRegion] || {};

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {selectedRegion ? `${selectedRegion} Metrics` : 'Overall Metrics'}
      </Typography>
      
      <List>
        <ListItem>
          <ListItemText
            primary="Price Impact"
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {impact.direction === 'up' ? 
                  <TrendingUp color="error" /> : 
                  <TrendingDown color="success" />
                }
                {Math.abs(selectedMetrics.priceImpact).toFixed(2)}%
              </Box>
            }
          />
        </ListItem>
        
        <Divider />
        
        <ListItem>
          <ListItemText
            primary="Conflict-Price Correlation"
            secondary={
              <Chip
                label={selectedMetrics.correlation.toFixed(2)}
                color={getCorrelationColor(selectedMetrics.correlation)}
                size="small"
              />
            }
          />
        </ListItem>
        
        <Divider />
        
        <ListItem>
          <ListItemText
            primary="Price Volatility"
            secondary={`${selectedMetrics.volatility.toFixed(2)}%`}
          />
        </ListItem>
        
        <Divider />
        
        <ListItem>
          <ListItemText
            primary="Average Conflict Intensity"
            secondary={selectedMetrics.avgConflict.toFixed(2)}
          />
        </ListItem>
      </List>
    </Box>
  );
};

const calculateAggregateMetrics = (metrics) => {
  const values = Object.values(metrics);
  return {
    priceImpact: values.reduce((sum, m) => sum + m.priceImpact, 0) / values.length,
    correlation: values.reduce((sum, m) => sum + m.correlation, 0) / values.length,
    volatility: values.reduce((sum, m) => sum + m.volatility, 0) / values.length,
    avgConflict: values.reduce((sum, m) => sum + m.avgConflict, 0) / values.length
  };
};

const getCorrelationColor = (correlation) => {
  const abs = Math.abs(correlation);
  if (abs > 0.7) return 'error';
  if (abs > 0.4) return 'warning';
  return 'success';
};

export default ConflictMetricsPanel;