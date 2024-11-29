//src/components/analysis/spatial-analysis/components/clusters/EfficiencyExplanation.js

import React from 'react';
import { 
  Paper, 
  Typography, 
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const efficiencyMetrics = [
  {
    name: 'Internal Connectivity',
    description: 'Measures actual connections between markets relative to potential connections.',
    interpretation: [
      { level: 'High', threshold: 0.7, description: 'Strong network of trade relationships' },
      { level: 'Medium', threshold: 0.4, description: 'Moderate market linkages' },
      { level: 'Low', threshold: 0, description: 'Limited market connections' }
    ],
    icon: '🔄'
  },
  {
    name: 'Market Coverage',
    description: 'The proportion of total markets included in the cluster.',
    interpretation: [
      { level: 'High', threshold: 0.7, description: 'Broad regional influence' },
      { level: 'Medium', threshold: 0.4, description: 'Moderate regional presence' },
      { level: 'Low', threshold: 0, description: 'Limited geographical reach' }
    ],
    icon: '📍'
  },
  {
    name: 'Price Convergence',
    description: 'Uniformity of prices across markets within the cluster.',
    interpretation: [
      { level: 'High', threshold: 0.7, description: 'Strong price integration' },
      { level: 'Medium', threshold: 0.4, description: 'Some price variations' },
      { level: 'Low', threshold: 0, description: 'Significant price disparities' }
    ],
    icon: '💲'
  },
  {
    name: 'Market Stability',
    description: 'Consistency of trade flows and price levels over time.',
    interpretation: [
      { level: 'High', threshold: 0.7, description: 'Robust trade activity' },
      { level: 'Medium', threshold: 0.4, description: 'Moderate trade flows' },
      { level: 'Low', threshold: 0, description: 'Weak trade connections' }
    ],
    icon: '📊'
  }
];

const MetricCard = ({ metric }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="span" sx={{ mr: 1 }}>
          {metric.icon}
        </Typography>
        <Typography variant="h6">
          {metric.name}
        </Typography>
        <Tooltip title={metric.description}>
          <IconButton size="small" sx={{ ml: 'auto' }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" paragraph>
        {metric.description}
      </Typography>

      <Box sx={{ mt: 2 }}>
        {metric.interpretation.map(({ level, threshold, description }) => (
          <Box key={level} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ mr: 1, minWidth: 60 }}>
                {level}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={threshold * 100}
                sx={{ 
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: 
                      level === 'High' ? 'success.main' :
                      level === 'Medium' ? 'warning.main' : 
                      'error.main'
                  }
                }}
              />
              <Typography variant="body2" sx={{ ml: 1, minWidth: 45 }}>
                {(threshold * 100).toFixed(0)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const EfficiencyExplanation = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Market Cluster Efficiency Analysis
      </Typography>
      
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        This analysis evaluates market integration and efficiency through multiple complementary metrics, 
        helping identify patterns of market connectivity and price transmission across Yemen's regions.
      </Typography>

      <Grid container spacing={3}>
        {efficiencyMetrics.map((metric) => (
          <Grid item xs={12} md={6} key={metric.name}>
            <MetricCard metric={metric} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" gutterBottom>
          Economic Implications
        </Typography>
        <Typography variant="body1" paragraph>
          Understanding market cluster efficiency is crucial for:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Market Integration
            </Typography>
            <Typography variant="body2">
              High efficiency scores indicate well-functioning markets with effective price transmission 
              and robust trade flows, suggesting strong economic integration.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Trade Barriers
            </Typography>
            <Typography variant="body2">
              Low scores may indicate barriers to trade, market fragmentation, or conflict-related 
              disruptions that require targeted interventions.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Policy Implications
            </Typography>
            <Typography variant="body2">
              Metrics help identify areas needing support and guide the development of targeted 
              interventions to improve market function and integration.
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default EfficiencyExplanation;