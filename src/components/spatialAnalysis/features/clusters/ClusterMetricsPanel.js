import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  List,
  ListItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MetricCard from '../../atoms/MetricCard';

const ClusterMetricsPanel = ({ selectedCluster }) => {
  const theme = useTheme();

  if (!selectedCluster) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          Select a cluster to view detailed metrics
        </Typography>
      </Paper>
    );
  }

  const {
    main_market,
    connected_markets = [],
    metrics = {}
  } = selectedCluster;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {/* Cluster Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {main_market} Cluster
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {connected_markets.length} connected markets
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Primary Metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Average Price"
            value={metrics.avgPrice || 0}
            format="currency"
            description="Average price across markets"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Market Count"
            value={metrics.marketCount || 0}
            format="number"
            description="Number of connected markets"
          />
        </Grid>

        <Grid item xs={12}>
          <MetricCard
            title="Conflict Intensity"
            value={metrics.avgConflict || 0}
            format="number"
            description="Average conflict intensity"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Market List */}
      <Typography variant="subtitle2" gutterBottom>
        Connected Markets
      </Typography>
      <List
        sx={{ 
          maxHeight: 300, 
          overflowY: 'auto',
          bgcolor: theme.palette.grey[50],
          borderRadius: 1,
          p: 1
        }}
      >
        {connected_markets.map((market) => (
          <ListItem 
            key={market}
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: 0.5,
              '&:nth-of-type(odd)': {
                bgcolor: 'white'
              }
            }}
          >
            <Typography variant="body2">
              {market}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

ClusterMetricsPanel.propTypes = {
  selectedCluster: PropTypes.shape({
    main_market: PropTypes.string.isRequired,
    connected_markets: PropTypes.arrayOf(PropTypes.string),
    metrics: PropTypes.shape({
      avgPrice: PropTypes.number,
      avgConflict: PropTypes.number,
      marketCount: PropTypes.number
    })
  })
};

export default React.memo(ClusterMetricsPanel);
