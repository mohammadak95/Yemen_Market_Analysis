// src/components/analysis/spatial-analysis/components/autocorrelation/MoranScatterPlot.js

import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

// Consistent color scheme with LISAMap
const CLUSTER_COLORS = {
  'high-high': '#ff0000',
  'low-low': '#0000ff',
  'high-low': '#ff9900',
  'low-high': '#00ff00',
  'not-significant': '#999999'
};

const MoranScatterPlot = ({ data, timeSeriesData }) => {
  const scatterData = useMemo(() => {
    if (!data?.local || !timeSeriesData?.length) return [];
    
    try {
      const processedData = Object.entries(data.local).map(([region, metrics]) => {
        // Find the corresponding time series data for this region
        const regionData = timeSeriesData.find(d => d.region === region);
        if (!regionData) return null;

        // Handle missing p-value
        const hasClusterType = Boolean(metrics.cluster_type);

        return {
          name: region,
          x: regionData.standardized_price || 0,
          y: metrics.local_i || 0,
          price: regionData.price || 0,
          localI: metrics.local_i,
          cluster: metrics.cluster_type || 'not-significant',
          significance: hasClusterType, // Consider significant if it has a cluster type
          color: CLUSTER_COLORS[metrics.cluster_type || 'not-significant']
        };
      }).filter(Boolean);

      return processedData;
    } catch (error) {
      console.error('Error processing scatter data:', error);
      return [];
    }
  }, [data, timeSeriesData]);

  if (!scatterData.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1" color="error">
          No data available for Moran scatter plot
        </Typography>
      </Paper>
    );
  }

  // Group data by cluster type for separate scatter plots
  const groupedData = Object.keys(CLUSTER_COLORS).reduce((acc, clusterType) => {
    acc[clusterType] = scatterData.filter(d => d.cluster === clusterType);
    return acc;
  }, {});

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Moran Scatter Plot
      </Typography>
      
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Standardized Price"
              label={{ value: 'Standardized Price', position: 'bottom' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Local Moran's I"
              label={{ value: "Local Moran's I", angle: -90, position: 'left' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <Box sx={{ 
                    bgcolor: 'background.paper', 
                    p: 1, 
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    boxShadow: 1
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {point.name}
                    </Typography>
                    <Typography variant="body2">
                      Price: ${point.price.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Local Moran's I: {point.localI !== null ? point.localI.toFixed(3) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: point.color,
                      fontWeight: 'bold'
                    }}>
                      Pattern: {point.cluster.replace('-', ' ').toUpperCase()}
                    </Typography>
                  </Box>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            <Legend />
            
            {/* Render a separate scatter for each cluster type */}
            {Object.entries(groupedData).map(([clusterType, clusterData]) => (
              clusterData.length > 0 && (
                <Scatter
                  key={clusterType}
                  name={clusterType.replace('-', ' ').toUpperCase()}
                  data={clusterData}
                  fill={CLUSTER_COLORS[clusterType]}
                  shape="circle"
                />
              )
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          This plot shows the relationship between standardized prices (x-axis) and their spatial lag
          (y-axis). Points are color-coded by their spatial pattern:
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {Object.entries(CLUSTER_COLORS).map(([type, color]) => (
            <Typography 
              key={type} 
              variant="body2" 
              sx={{ 
                color,
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '""',
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color,
                  marginRight: 1
                }
              }}
            >
              {type.replace('-', ' ').toUpperCase()}
            </Typography>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

MoranScatterPlot.propTypes = {
  data: PropTypes.shape({
    global: PropTypes.shape({
      moran_i: PropTypes.number,
      p_value: PropTypes.number,
      z_score: PropTypes.number,
      significance: PropTypes.bool
    }),
    local: PropTypes.object
  }),
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string,
    price: PropTypes.number,
    standardized_price: PropTypes.number
  }))
};

export default MoranScatterPlot;
