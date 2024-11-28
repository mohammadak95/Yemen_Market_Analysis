// src/components/analysis/spatial-analysis/components/clusters/EfficiencyRadarChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { useTheme } from '@mui/material/styles';

const EfficiencyRadarChart = ({ cluster, compareCluster }) => {
  const theme = useTheme();

  const data = useMemo(() => {
    if (!cluster?.metrics) return [];

    // Helper to safely get metric value
    const getMetricValue = (metrics, key) => {
      const value = metrics?.[key];
      return typeof value === 'number' && !isNaN(value) ? Math.min(Math.max(value, 0), 1) : 0;
    };

    return [
      {
        metric: 'Internal Connectivity',
        value: getMetricValue(cluster.metrics, 'internal_connectivity'),
        compare: getMetricValue(compareCluster?.metrics, 'internal_connectivity')
      },
      {
        metric: 'Market Coverage',
        value: getMetricValue(cluster.metrics, 'coverage'),
        compare: getMetricValue(compareCluster?.metrics, 'coverage')
      },
      {
        metric: 'Price Convergence',
        value: getMetricValue(cluster.metrics, 'price_convergence'),
        compare: getMetricValue(compareCluster?.metrics, 'price_convergence')
      },
      {
        metric: 'Flow Density',
        value: getMetricValue(cluster.metrics, 'flow_density'),
        compare: getMetricValue(compareCluster?.metrics, 'flow_density')
      }
    ];
  }, [cluster, compareCluster]);

  if (!data.length) {
    return (
      <div style={{ 
        height: 300, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: theme.palette.text.secondary 
      }}>
        No efficiency metrics available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    return (
      <div style={{ 
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(1),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}>
        <div style={{ color: theme.palette.text.primary }}>
          {payload[0].payload.metric}
        </div>
        <div style={{ color: theme.palette.primary.main }}>
          {cluster.main_market}: {(payload[0].value * 100).toFixed(1)}%
        </div>
        {compareCluster && (
          <div style={{ color: theme.palette.secondary.main }}>
            {compareCluster.main_market}: {(payload[1]?.value * 100).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke={theme.palette.divider} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ 
            fill: theme.palette.text.secondary,
            fontSize: 12 
          }}
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
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};

EfficiencyRadarChart.propTypes = {
  cluster: PropTypes.shape({
    main_market: PropTypes.string.isRequired,
    metrics: PropTypes.shape({
      internal_connectivity: PropTypes.number,
      coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      flow_density: PropTypes.number
    }).isRequired
  }).isRequired,
  compareCluster: PropTypes.shape({
    main_market: PropTypes.string.isRequired,
    metrics: PropTypes.shape({
      internal_connectivity: PropTypes.number,
      coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      flow_density: PropTypes.number
    }).isRequired
  })
};

export default React.memo(EfficiencyRadarChart);