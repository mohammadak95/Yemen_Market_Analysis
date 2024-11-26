// src/components/analysis/spatial-analysis/components/flows/FlowMetricsPanel.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FlowMetricsPanel = ({ flowMetrics, networkStats, timeSeriesFlows, timeAggregation }) => {
  // Default to daily if timeAggregation is not provided
  const currentTimeSeriesData = timeSeriesFlows[timeAggregation || 'daily'] || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Network Statistics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Network Statistics
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Total Flow Volume</TableCell>
                <TableCell align="right">{networkStats?.totalVolume?.toFixed(2) || '0.00'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Average Flow Size</TableCell>
                <TableCell align="right">{networkStats?.avgFlowSize?.toFixed(2) || '0.00'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Active Markets</TableCell>
                <TableCell align="right">{networkStats?.activeMarkets || 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Flow Density</TableCell>
                <TableCell align="right">{((networkStats?.flowDensity || 0) * 100).toFixed(2)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Flows */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top Flow Routes
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Route</TableCell>
                <TableCell align="right">Total Flow</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(flowMetrics?.topFlows || []).map((flow, index) => (
                <TableRow key={index}>
                  <TableCell>{flow.source} → {flow.target}</TableCell>
                  <TableCell align="right">{flow.total_flow.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Time Series Flows */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Flow Volume Over Time ({timeAggregation || 'daily'})
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={currentTimeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total_flow" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

FlowMetricsPanel.propTypes = {
  flowMetrics: PropTypes.shape({
    totalFlows: PropTypes.number,
    averageFlow: PropTypes.number,
    maxFlow: PropTypes.number,
    flowCount: PropTypes.number,
    flowDensity: PropTypes.number,
    uniqueMarkets: PropTypes.number,
    topFlows: PropTypes.arrayOf(PropTypes.shape({
      source: PropTypes.string,
      target: PropTypes.string,
      total_flow: PropTypes.number
    }))
  }).isRequired,
  networkStats: PropTypes.shape({
    totalVolume: PropTypes.number,
    avgFlowSize: PropTypes.number,
    activeMarkets: PropTypes.number,
    flowDensity: PropTypes.number
  }).isRequired,
  timeSeriesFlows: PropTypes.shape({
    daily: PropTypes.array,
    weekly: PropTypes.array,
    monthly: PropTypes.array
  }).isRequired,
  timeAggregation: PropTypes.oneOf(['daily', 'weekly', 'monthly']).isRequired,
};

export default React.memo(FlowMetricsPanel);
