// src/components/analysis/spatial-analysis/components/clusters/EfficiencyRadarChart.js

import React from 'react';
import PropTypes from 'prop-types';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';

const EfficiencyRadarChart = ({ cluster }) => {
  // Safety check for cluster and efficiency_metrics
  if (!cluster?.efficiency_metrics) {
    console.warn('Invalid cluster data provided to EfficiencyRadarChart');
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No data available
      </div>
    );
  }

  const safeValue = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value)); // Ensure value is between 0 and 1
  };

  const data = [
    {
      metric: 'Connectivity',
      value: safeValue(cluster.efficiency_metrics.internal_connectivity)
    },
    {
      metric: 'Coverage',
      value: safeValue(cluster.efficiency_metrics.market_coverage)
    },
    {
      metric: 'Price Convergence',
      value: safeValue(cluster.efficiency_metrics.price_convergence)
    },
    {
      metric: 'Stability',
      value: safeValue(cluster.efficiency_metrics.stability)
    }
  ];

  const formatTooltipValue = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return value.toFixed(2);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#666', fontSize: 12 }}
        />
        <Tooltip
          formatter={formatTooltipValue}
          labelStyle={{ color: '#666' }}
        />
        <Radar
          name={cluster.main_market || 'Unknown Market'}
          dataKey="value"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

EfficiencyRadarChart.propTypes = {
  cluster: PropTypes.shape({
    main_market: PropTypes.string,
    efficiency_metrics: PropTypes.shape({
      internal_connectivity: PropTypes.number,
      market_coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      stability: PropTypes.number
    })
  }).isRequired
};

export default EfficiencyRadarChart;
