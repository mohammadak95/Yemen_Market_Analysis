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
  Legend,
  Label
} from 'recharts';
import { Paper, Typography, Box, Alert } from '@mui/material';
import PropTypes from 'prop-types';

// Consistent color scheme
const CLUSTER_COLORS = {
  'high-high': '#ff0000',
  'low-low': '#0000ff',
  'high-low': '#ff9900',
  'low-high': '#00ff00',
  'not-significant': '#999999'
};

// Helper functions for calculations
const calculateMean = (values) => {
  if (!values || !values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateStandardDeviation = (values, mean) => {
  if (!values || !values.length) return 1;
  const squareDiffs = values.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

const standardizeValues = (values) => {
  const mean = calculateMean(values);
  const std = calculateStandardDeviation(values, mean);
  return values.map(value => (value - mean) / std);
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  
  return (
    <Box sx={{ 
      bgcolor: 'background.paper', 
      p: 1.5,
      border: 1,
      borderColor: 'grey.300',
      borderRadius: 1,
      boxShadow: 1,
      minWidth: 200
    }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {point.name}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        Standardized Price: {point.x.toFixed(3)}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        Local Moran's I: {point.y.toFixed(3)}
      </Typography>
      <Typography variant="body2" sx={{ 
        color: point.color,
        fontWeight: 'bold'
      }}>
        Pattern: {point.cluster.replace('-', ' ').toUpperCase()}
      </Typography>
    </Box>
  );
};

const MoranScatterPlot = ({ data, timeSeriesData }) => {
  // Debug log to verify input data
  console.log('MoranScatterPlot received:', { data, timeSeriesData });

  const scatterData = useMemo(() => {
    if (!data?.local || !timeSeriesData?.length) {
      console.warn('Missing required data for scatter plot:', { 
        hasLocal: Boolean(data?.local), 
        timeSeriesLength: timeSeriesData?.length 
      });
      return [];
    }
    
    try {
      // Extract prices and standardize them
      const prices = timeSeriesData.map(d => d.usdPrice).filter(p => !isNaN(p));
      const standardizedPrices = standardizeValues(prices);
      const priceMap = new Map(timeSeriesData.map((d, i) => [d.region, standardizedPrices[i]]));

      const processedData = Object.entries(data.local).map(([region, metrics]) => {
        const standardizedPrice = priceMap.get(region);
        if (typeof standardizedPrice !== 'number') {
          console.warn(`No valid price data found for region: ${region}`);
          return null;
        }

        return {
          name: region,
          x: standardizedPrice,
          y: metrics.local_i || 0,
          price: timeSeriesData.find(d => d.region === region)?.usdPrice || 0,
          localI: metrics.local_i,
          cluster: metrics.cluster_type || 'not-significant',
          color: CLUSTER_COLORS[metrics.cluster_type] || CLUSTER_COLORS['not-significant']
        };
      }).filter(Boolean);

      console.log('Processed scatter data:', {
        points: processedData.length,
        sample: processedData[0]
      });

      return processedData;
    } catch (error) {
      console.error('Error processing scatter data:', error);
      return [];
    }
  }, [data, timeSeriesData]);

  if (!scatterData.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="subtitle1">
          Unable to display Moran scatter plot
        </Typography>
        <Typography variant="body2">
          No valid data available for visualization
        </Typography>
      </Alert>
    );
  }

  // Group data by cluster type
  const groupedData = Object.keys(CLUSTER_COLORS).reduce((acc, clusterType) => {
    acc[clusterType] = scatterData.filter(d => d.cluster === clusterType);
    return acc;
  }, {});

  return (
    <Box sx={{ width: '100%', height: 500 }}>
      <Typography variant="h6" gutterBottom>
        Moran Scatter Plot
      </Typography>
      
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Standardized Price"
          >
            <Label
              value="Standardized Price"
              position="bottom"
              offset={40}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="Local Moran's I"
          >
            <Label
              value="Local Moran's I"
              angle={-90}
              position="left"
              offset={40}
            />
          </YAxis>
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          
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
    </Box>
  );
};

MoranScatterPlot.propTypes = {
  data: PropTypes.shape({
    global: PropTypes.shape({
      moran_i: PropTypes.number,
      p_value: PropTypes.number,
      z_score: PropTypes.number
    }),
    local: PropTypes.object
  }),
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string,
    usdPrice: PropTypes.number,
    month: PropTypes.string
  }))
};

export default MoranScatterPlot;
