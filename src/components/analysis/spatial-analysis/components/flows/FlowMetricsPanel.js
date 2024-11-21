// src/components/analysis/spatial-analysis/components/flows/FlowMetricsPanel.js

import React from 'react';
import {
  Card, CardContent, Typography, Grid, Box,
  Table, TableBody, TableCell, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const FlowMetricsPanel = ({ 
  flowMetrics, 
  networkStats, 
  timeAggregation,
  onTimeAggregationChange 
}) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Time Aggregation
          </Typography>
          <ToggleButtonGroup
            value={timeAggregation}
            exclusive
            onChange={(_, value) => value && onTimeAggregationChange(value)}
            size="small"
          >
            <ToggleButton value="daily">Daily</ToggleButton>
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Network Statistics
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Total Flow Volume</TableCell>
                  <TableCell align="right">{networkStats.totalVolume.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Average Flow Size</TableCell>
                  <TableCell align="right">{networkStats.avgFlowSize.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Active Markets</TableCell>
                  <TableCell align="right">{networkStats.activeMarkets}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Flow Density</TableCell>
                  <TableCell align="right">{(networkStats.flowDensity * 100).toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Flow Routes
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Route</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Price Diff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flowMetrics.topFlows.map((flow, index) => (
                  <TableRow key={index}>
                    <TableCell>{flow.source} → {flow.target}</TableCell>
                    <TableCell align="right">{flow.total_flow.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {flow.avg_price_differential.toFixed(2)}
                        {flow.avg_price_differential > 0 ? (
                          <TrendingUp color="error" fontSize="small" />
                        ) : (
                          <TrendingDown color="success" fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Market Integration Metrics
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Market</TableCell>
                  <TableCell align="right">Inflow</TableCell>
                  <TableCell align="right">Outflow</TableCell>
                  <TableCell align="right">Net Flow</TableCell>
                  <TableCell align="right">Price Impact</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(flowMetrics.regionMetrics)
                  .sort((a, b) => b[1].totalFlow - a[1].totalFlow)
                  .map(([region, metrics]) => (
                    <TableRow key={region}>
                      <TableCell>{region}</TableCell>
                      <TableCell align="right">{metrics.inflow.toFixed(2)}</TableCell>
                      <TableCell align="right">{metrics.outflow.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {metrics.netFlow.toFixed(2)}
                          {metrics.netFlow > 0 ? (
                            <TrendingUp color="success" fontSize="small" />
                          ) : (
                            <TrendingDown color="error" fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {(metrics.priceImpact * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default FlowMetricsPanel;