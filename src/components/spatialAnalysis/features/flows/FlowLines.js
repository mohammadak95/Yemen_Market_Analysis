/**
 * Market Flow Lines Component
 * 
 * Visualizes temporal patterns in market flows using interactive line charts.
 * Features include:
 * - Time series visualization of flow volumes
 * - Flow trend analysis
 * - Interactive selection and filtering
 * - Comprehensive tooltips
 */

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper, Tooltip as MuiTooltip } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Label
} from 'recharts';
import chroma from 'chroma-js';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { 
  FLOW_COLORS, 
  VISUALIZATION_PARAMS,
  FLOW_THRESHOLDS,
  FLOW_STATUS 
} from './types';

// Helper function to calculate moving average
const calculateMovingAverage = (data, window = 3) => {
  return data.map((point, index, array) => {
    const start = Math.max(0, index - Math.floor(window / 2));
    const end = Math.min(array.length, index + Math.floor(window / 2) + 1);
    const values = array.slice(start, end);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  });
};

// Helper function to calculate trend
const calculateTrend = (data) => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, y) => sum + y, 0) / n;

  let xxSum = 0;
  let xySum = 0;
  data.forEach((y, x) => {
    xxSum += (x - xMean) ** 2;
    xySum += (x - xMean) * (y - yMean);
  });

  const slope = xySum / xxSum;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  const yPred = data.map((_, x) => slope * x + intercept);
  const ssRes = data.reduce((sum, y, i) => sum + (y - yPred[i]) ** 2, 0);
  const ssTot = data.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
};

const FlowLines = ({
  flows,
  timeSeriesData,
  selectedFlow,
  onFlowSelect
}) => {
  const theme = useTheme();

  // Process data for line chart with error handling
  const chartData = useMemo(() => {
    if (!Array.isArray(flows) || !Array.isArray(timeSeriesData)) {
      console.error('Invalid input data format');
      return { data: [], trends: {} };
    }

    try {
      // Get unique dates
      const dates = [...new Set(timeSeriesData.map(d => d.month))].sort();

      // Calculate flow time series
      const processedData = dates.map(date => {
        const dateData = {
          date,
          ...flows.reduce((acc, flow) => {
            const flowKey = `${flow.source}-${flow.target}`;
            const timeData = timeSeriesData.find(td => 
              td.month === date && 
              (td.region === flow.source || td.region === flow.target)
            );
            
            acc[flowKey] = timeData ? flow.total_flow : 0;
            return acc;
          }, {})
        };

        return dateData;
      });

      // Calculate trends for each flow
      const trends = {};
      flows.forEach(flow => {
        const flowKey = `${flow.source}-${flow.target}`;
        const flowData = processedData.map(d => d[flowKey]);
        trends[flowKey] = calculateTrend(flowData);
      });

      return { data: processedData, trends };
    } catch (error) {
      console.error('Error processing flow data:', error);
      return { data: [], trends: {} };
    }
  }, [flows, timeSeriesData]);

  // Create color scale with error handling
  const colorScale = useMemo(() => {
    try {
      const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
      return chroma.scale([FLOW_COLORS.NEUTRAL, FLOW_COLORS.POSITIVE])
        .domain([0, maxFlow])
        .mode('lch');
    } catch (error) {
      console.error('Error creating color scale:', error);
      return () => FLOW_COLORS.NEUTRAL;
    }
  }, [flows]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <Paper
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <Typography variant="subtitle2">
          {new Date(label).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
          })}
        </Typography>
        {payload.map((entry, index) => {
          const [source, target] = entry.name.split('-');
          const trend = chartData.trends[entry.name];
          const trendDirection = trend.slope > 0 ? 'Increasing' : trend.slope < 0 ? 'Decreasing' : 'Stable';
          
          return (
            <Box key={index} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: entry.color, fontWeight: 'medium' }}>
                {source} → {target}
              </Typography>
              <Typography variant="body2">
                Flow: {entry.value.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Trend: {trendDirection} (R² = {trend.r2.toFixed(3)})
              </Typography>
            </Box>
          );
        })}
      </Paper>
    );
  }, [chartData.trends]);

  // Error state
  if (!chartData.data.length) {
    return (
      <Box 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <Typography color="text.secondary">
          No flow data available for visualization
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Please ensure time series data is properly loaded
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Methodology Tooltip */}
      <MuiTooltip
        title={
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Flow Line Analysis
            </Typography>
            <Typography variant="body2">
              • Line thickness indicates flow volume
              <br/>
              • Color intensity shows relative strength
              <br/>
              • Dashed line shows average flow
              <br/>
              • Trend analysis uses linear regression
            </Typography>
          </Box>
        }
      >
        <InfoOutlinedIcon 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            color: 'text.secondary',
            cursor: 'help'
          }} 
        />
      </MuiTooltip>

      <ResponsiveContainer>
        <LineChart
          data={chartData.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="date"
            tickFormatter={date => new Date(date).toLocaleDateString('en-US', {
              year: '2-digit',
              month: 'short'
            })}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke={theme.palette.text.primary}
          >
            <Label
              value="Time Period"
              position="bottom"
              offset={40}
              style={{ fill: theme.palette.text.secondary }}
            />
          </XAxis>
          <YAxis
            stroke={theme.palette.text.primary}
          >
            <Label
              value="Flow Volume"
              angle={-90}
              position="insideLeft"
              offset={0}
              style={{ fill: theme.palette.text.secondary }}
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const [source, target] = value.split('-');
              const trend = chartData.trends[value];
              const trendIcon = trend.slope > 0 ? '↑' : trend.slope < 0 ? '↓' : '→';
              return `${source} ${trendIcon} ${target}`;
            }}
          />
          <Brush
            dataKey="date"
            height={30}
            stroke={theme.palette.primary.main}
            fill={theme.palette.background.paper}
            tickFormatter={date => new Date(date).toLocaleDateString('en-US', {
              year: '2-digit',
              month: 'short'
            })}
          />

          {flows.map((flow, index) => {
            const flowKey = `${flow.source}-${flow.target}`;
            const isSelected = selectedFlow && 
              selectedFlow.source === flow.source && 
              selectedFlow.target === flow.target;

            // Calculate moving average for smoother lines
            const flowData = chartData.data.map(d => d[flowKey]);
            const smoothedData = calculateMovingAverage(flowData);

            return (
              <Line
                key={flowKey}
                type="monotone"
                dataKey={flowKey}
                name={flowKey}
                stroke={colorScale(flow.total_flow).hex()}
                strokeWidth={isSelected ? 3 : 2}
                dot={isSelected}
                activeDot={{
                  r: 8,
                  onClick: () => onFlowSelect(flow)
                }}
                opacity={selectedFlow ? (isSelected ? 1 : 0.3) : 0.8}
                connectNulls={true}
                data={chartData.data.map((d, i) => ({
                  ...d,
                  [flowKey]: smoothedData[i]
                }))}
              />
            );
          })}

          {/* Reference line for average flow */}
          <ReferenceLine
            y={flows.reduce((sum, f) => sum + (f.total_flow || 0), 0) / flows.length}
            stroke={theme.palette.text.secondary}
            strokeDasharray="3 3"
            label={{
              value: 'Average Flow',
              position: 'right',
              fill: theme.palette.text.secondary
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

FlowLines.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number
  })).isRequired,
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired
  })).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired
  }),
  onFlowSelect: PropTypes.func
};

export default React.memo(FlowLines);
