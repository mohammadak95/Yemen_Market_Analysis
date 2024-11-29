//src/components/analysis/spatial-analysis/components/clusters/EfficiencyRadarChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  Radar, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper } from '@mui/material';

const METRICS = [
  {
    key: 'internal_connectivity',
    label: 'Internal Connectivity',
    description: 'Market connection density'
  },
  {
    key: 'coverage',
    label: 'Market Coverage',
    description: 'Regional market reach'
  },
  {
    key: 'price_convergence',
    label: 'Price Convergence',
    description: 'Price uniformity'
  },
  {
    key: 'stability',
    label: 'Market Stability',
    description: 'Flow consistency'
  }
];

const EfficiencyRadarChart = ({ cluster, compareCluster }) => {
  const theme = useTheme();

  const data = useMemo(() => {
    if (!cluster?.metrics) return [];

    const getMetricValue = (metrics, key) => {
      const value = metrics?.[key];
      return typeof value === 'number' && !isNaN(value) ? Math.min(Math.max(value, 0), 1) : 0;
    };

    return METRICS.map(({ key, label }) => ({
      metric: label,
      value: getMetricValue(cluster.metrics, key),
      compare: compareCluster ? getMetricValue(compareCluster.metrics, key) : undefined
    }));
  }, [cluster, compareCluster]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    return (
      <Paper 
        elevation={3}
        sx={{ 
          p: 1.5,
          minWidth: 150,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {payload[0].payload.metric}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ color: theme.palette.primary.main }}
          >
            {cluster.main_market}: {(payload[0].value * 100).toFixed(1)}%
          </Typography>
          {compareCluster && payload[1] && (
            <Typography 
              variant="body2" 
              sx={{ color: theme.palette.secondary.main }}
            >
              {compareCluster.main_market}: {(payload[1].value * 100).toFixed(1)}%
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  const CustomLegend = ({ payload }) => (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: 2,
        mt: 2 
      }}
    >
      {payload.map((entry) => (
        <Box 
          key={entry.value}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: entry.color,
              borderRadius: '50%'
            }}
          />
          <Typography variant="body2">
            {entry.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  if (!data.length) {
    return (
      <Box
        sx={{ 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}
      >
        <Typography color="text.secondary">
          No efficiency metrics available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <RadarChart 
          data={data} 
          margin={{ top: 20, right: 30, bottom: 30, left: 30 }}
        >
          <PolarGrid 
            stroke={theme.palette.divider}
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ 
              fill: theme.palette.text.secondary,
              fontSize: 12 
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 1]}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            stroke={theme.palette.divider}
          />
          <Radar
            name={cluster.main_market}
            dataKey="value"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.3}
          />
          {compareCluster && (
            <Radar
              name={compareCluster.main_market}
              dataKey="compare"
              stroke={theme.palette.secondary.main}
              fill={theme.palette.secondary.main}
              fillOpacity={0.3}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
};

EfficiencyRadarChart.propTypes = {
  cluster: PropTypes.shape({
    main_market: PropTypes.string.isRequired,
    metrics: PropTypes.shape({
      internal_connectivity: PropTypes.number,
      coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      stability: PropTypes.number
    }).isRequired
  }).isRequired,
  compareCluster: PropTypes.shape({
    main_market: PropTypes.string.isRequired,
    metrics: PropTypes.shape({
      internal_connectivity: PropTypes.number,
      coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      stability: PropTypes.number
    }).isRequired
  })
};

export default React.memo(EfficiencyRadarChart);