// src/components/spatialAnalysis/features/autocorrelation/MoranScatterPlot.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const MoranScatterPlot = ({ data, globalMoranI }) => {
  const theme = useTheme();

  // Color mapping for LISA clusters
  const clusterColors = {
    'high-high': theme.palette.error.main,
    'low-low': theme.palette.primary.main,
    'high-low': theme.palette.warning.main,
    'low-high': theme.palette.info.main,
    'not_significant': theme.palette.grey[300]
  };

  // Transform data for scatter plot
  const scatterData = useMemo(() => {
    if (!data?.length) return [];

    // Calculate z-scores for values and spatial lags
    const values = data.map(d => d.localI);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return data.map(d => ({
      region: d.region,
      value: (d.localI - mean) / std,
      spatialLag: d.zScore || 0,
      clusterType: d.clusterType,
      significance: d.pValue < 0.05
    }));
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(1),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.region}</p>
        <p style={{ margin: '4px 0' }}>Value: {data.value.toFixed(3)}</p>
        <p style={{ margin: '4px 0' }}>Spatial Lag: {data.spatialLag.toFixed(3)}</p>
        <p style={{ margin: '4px 0' }}>
          Cluster Type: {data.clusterType.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join('-')}
        </p>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="value"
            name="Value"
            label={{ value: 'Standardized Value', position: 'bottom' }}
          />
          <YAxis
            type="number"
            dataKey="spatialLag"
            name="Spatial Lag"
            label={{ value: 'Spatial Lag', angle: -90, position: 'left' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference lines at x=0 and y=0 */}
          <ReferenceLine x={0} stroke={theme.palette.text.secondary} />
          <ReferenceLine y={0} stroke={theme.palette.text.secondary} />
          
          {/* Regression line based on global Moran's I */}
          <ReferenceLine
            segment={[
              { x: -2, y: -2 * globalMoranI },
              { x: 2, y: 2 * globalMoranI }
            ]}
            stroke={theme.palette.secondary.main}
            strokeDasharray="3 3"
          />

          {/* Plot points by cluster type */}
          {Object.entries(clusterColors).map(([type, color]) => (
            <Scatter
              key={type}
              name={type}
              data={scatterData.filter(d => d.clusterType === type)}
              fill={color}
              shape="circle"
              strokeWidth={d => d.significance ? 2 : 0}
              stroke={theme.palette.common.white}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'white',
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[2]
      }}>
        <div style={{ marginBottom: theme.spacing(1) }}>
          <strong>Cluster Types</strong>
        </div>
        {Object.entries(clusterColors).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: color,
              marginRight: 8,
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: theme.shadows[1]
            }} />
            <span style={{ fontSize: 12 }}>
              {type.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join('-')}
            </span>
          </div>
        ))}
        <div style={{ 
          marginTop: theme.spacing(1),
          paddingTop: theme.spacing(1),
          borderTop: `1px solid ${theme.palette.divider}`,
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 20,
              borderTop: `2px dashed ${theme.palette.secondary.main}`,
              marginRight: 8
            }} />
            <span>Moran's I Slope</span>
          </div>
        </div>
      </div>
    </div>
  );
};

MoranScatterPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string.isRequired,
    localI: PropTypes.number.isRequired,
    zScore: PropTypes.number,
    pValue: PropTypes.number,
    clusterType: PropTypes.oneOf([
      'high-high',
      'low-low',
      'high-low',
      'low-high',
      'not_significant'
    ]).isRequired
  })).isRequired,
  globalMoranI: PropTypes.number.isRequired
};

export default React.memo(MoranScatterPlot);
