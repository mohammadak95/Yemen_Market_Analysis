import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
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
  Brush
} from 'recharts';
import chroma from 'chroma-js';

const FlowLines = ({
  flows,
  timeSeriesData,
  selectedFlow,
  onFlowSelect
}) => {
  const theme = useTheme();

  // Process data for line chart
  const chartData = useMemo(() => {
    if (!flows?.length || !timeSeriesData?.length) return [];

    // Get unique dates
    const dates = [...new Set(timeSeriesData.map(d => d.month))].sort();

    // Create flow time series
    return dates.map(date => {
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
  }, [flows, timeSeriesData]);

  // Create color scale for flows
  const colorScale = useMemo(() => {
    const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
    return chroma.scale(['#fde0dd', '#c51b8a']).domain([0, maxFlow]);
  }, [flows]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <Box
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
          return (
            <Box key={index} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: entry.color }}>
                {source} → {target}
              </Typography>
              <Typography variant="body2">
                Flow: {entry.value.toFixed(2)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  if (!chartData.length) {
    return (
      <Box 
        sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="text.secondary">
          No flow data available for visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={date => new Date(date).toLocaleDateString('en-US', {
              year: '2-digit',
              month: 'short'
            })}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            label={{
              value: 'Flow Volume',
              angle: -90,
              position: 'insideLeft',
              offset: 0
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const [source, target] = value.split('-');
              return `${source} → ${target}`;
            }}
          />
          <Brush
            dataKey="date"
            height={30}
            stroke={theme.palette.primary.main}
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

            return (
              <Line
                key={flowKey}
                type="monotone"
                dataKey={flowKey}
                name={flowKey}
                stroke={colorScale(flow.total_flow).hex()}
                strokeWidth={isSelected ? 3 : 1}
                dot={isSelected}
                activeDot={{
                  onClick: () => onFlowSelect(flow)
                }}
                opacity={selectedFlow ? (isSelected ? 1 : 0.3) : 0.8}
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
