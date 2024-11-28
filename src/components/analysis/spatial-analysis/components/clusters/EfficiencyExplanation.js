// src/components/analysis/spatial-analysis/components/clusters/EfficiencyExplanation.js

import React from 'react';
import { 
  Paper, 
  Typography, 
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
} from '@mui/material';

const efficiencyMetrics = [
  {
    name: 'Internal Connectivity',
    description: 'Measures actual connections between markets relative to potential connections.',
    interpretation: [
      'High (>0.7): Strong network of trade relationships',
      'Medium (0.4-0.7): Moderate market linkages',
      'Low (<0.4): Limited market connections'
    ]
  },
  {
    name: 'Market Coverage',
    description: 'The proportion of total markets included in the cluster.',
    interpretation: [
      'High (>0.7): Broad regional influence',
      'Medium (0.4-0.7): Moderate regional presence',
      'Low (<0.4): Limited geographical reach'
    ]
  },
  {
    name: 'Price Convergence',
    description: 'Uniformity of prices across markets within the cluster.',
    interpretation: [
      'High (>0.7): Strong price integration',
      'Medium (0.4-0.7): Some price variations',
      'Low (<0.4): Significant price disparities'
    ]
  },
  {
    name: 'Flow Density',
    description: 'Intensity of trade flows between markets in the cluster.',
    interpretation: [
      'High (>0.7): Robust trade activity',
      'Medium (0.4-0.7): Moderate trade flows',
      'Low (<0.4): Weak trade connections'
    ]
  }
];

const EfficiencyExplanation = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Market Cluster Efficiency Analysis
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 3 }}>
        This analysis evaluates market integration and efficiency through multiple complementary metrics, 
        helping identify patterns of market connectivity and price transmission across Yemen's regions.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <TableContainer>
        <Table size="small">
          <TableBody>
            {efficiencyMetrics.map((metric, index) => (
              <TableRow key={metric.name}>
                <TableCell sx={{ border: 0, verticalAlign: 'top', width: '30%' }}>
                  <Typography variant="subtitle2">
                    {metric.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ border: 0 }}>
                  <Typography variant="body2" paragraph>
                    {metric.description}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {metric.interpretation.map((item, i) => (
                      <Typography 
                        key={i} 
                        component="li" 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {item}
                      </Typography>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Economic Implications
        </Typography>
        <Typography variant="body2">
          High efficiency scores indicate well-functioning markets with effective price transmission 
          and trade flows. Low scores may suggest barriers to trade, market fragmentation, or 
          conflict-related disruptions requiring targeted interventions.
        </Typography>
      </Box>
    </Paper>
  );
};

export default EfficiencyExplanation;
