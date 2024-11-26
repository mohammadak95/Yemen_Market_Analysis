import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTheme } from '@mui/material/styles';
import MetricCard from '../common/MetricCard';
import { 
  selectFlowsWithCoordinates,
  selectMarketIntegration,
  selectTimeSeriesData,
  selectGeometryData
} from '../../../../selectors/optimizedSelectors';

const NetworkMetrics = () => {
  const theme = useTheme();
  const flows = useSelector(selectFlowsWithCoordinates);
  const marketIntegration = useSelector(selectMarketIntegration);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometryData = useSelector(selectGeometryData);

  // Calculate network-wide metrics
  const networkMetrics = useMemo(() => {
    if (!flows?.length || !marketIntegration) return null;

    const totalFlow = flows.reduce((sum, flow) => sum + flow.totalFlow, 0);
    const avgFlow = totalFlow / flows.length;
    const uniqueMarkets = new Set([
      ...flows.map(f => f.source),
      ...flows.map(f => f.target)
    ]);
    const maxPossibleConnections = uniqueMarkets.size * (uniqueMarkets.size - 1) / 2;
    const actualConnections = flows.length;

    return {
      totalFlow,
      avgFlow,
      flowDensity: actualConnections / maxPossibleConnections,
      uniqueMarkets: uniqueMarkets.size,
      networkDensity: marketIntegration.flow_density || 0,
      integrationScore: marketIntegration.integration_score || 0
    };
  }, [flows, marketIntegration]);

  // Calculate top market pairs by flow volume
  const topFlowPairs = useMemo(() => {
    if (!flows?.length) return [];
    
    return flows
      .sort((a, b) => b.totalFlow - a.totalFlow)
      .slice(0, 10)
      .map(flow => ({
        source: flow.source,
        target: flow.target,
        totalFlow: flow.totalFlow,
        avgFlow: flow.avgFlow,
        flowCount: flow.flowCount,
        correlation: marketIntegration?.price_correlation?.[flow.source]?.[flow.target] || 0
      }));
  }, [flows, marketIntegration]);

  // Calculate market connectivity metrics
  const connectivityMetrics = useMemo(() => {
    if (!flows?.length || !marketIntegration) return null;

    const marketConnections = {};
    flows.forEach(flow => {
      marketConnections[flow.source] = (marketConnections[flow.source] || 0) + 1;
      marketConnections[flow.target] = (marketConnections[flow.target] || 0) + 1;
    });

    const values = Object.values(marketConnections);
    return {
      avgConnections: values.reduce((a, b) => a + b, 0) / values.length,
      maxConnections: Math.max(...values),
      minConnections: Math.min(...values),
      stdDev: Math.sqrt(
        values.reduce((sum, val) => 
          sum + Math.pow(val - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0
        ) / values.length
      )
    };
  }, [flows, marketIntegration]);

  if (!networkMetrics || !connectivityMetrics) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          No network metrics available
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Summary Metrics */}
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Network Integration"
          value={networkMetrics.integrationScore}
          format="percentage"
          description="Overall market integration score"
          trend={networkMetrics.integrationScore > 0.5 ? 'up' : 'down'}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Flow Density"
          value={networkMetrics.flowDensity}
          format="percentage"
          description="Proportion of active market connections"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Average Connectivity"
          value={connectivityMetrics.avgConnections}
          format="number"
          description="Average connections per market"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Active Markets"
          value={networkMetrics.uniqueMarkets}
          format="number"
          description="Number of connected markets"
        />
      </Grid>

      {/* Top Flow Pairs Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              Top Market Connections
              <Tooltip title="Markets with highest trade flow volumes">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source Market</TableCell>
                  <TableCell>Target Market</TableCell>
                  <TableCell align="right">Total Flow</TableCell>
                  <TableCell align="right">Avg Flow</TableCell>
                  <TableCell align="right">Flow Count</TableCell>
                  <TableCell align="right">Price Correlation</TableCell>
                  <TableCell>Integration Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topFlowPairs.map((pair, index) => (
                  <TableRow key={index}>
                    <TableCell>{pair.source}</TableCell>
                    <TableCell>{pair.target}</TableCell>
                    <TableCell align="right">
                      {pair.totalFlow.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {pair.avgFlow.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">{pair.flowCount}</TableCell>
                    <TableCell align="right">
                      {(pair.correlation * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {pair.correlation > 0.7 ? (
                          <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                        ) : pair.correlation < 0.3 ? (
                          <TrendingDownIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                        ) : null}
                        {pair.correlation > 0.7 ? 'Strong' : 
                         pair.correlation > 0.3 ? 'Moderate' : 'Weak'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* Network Statistics */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Network Statistics
              <Tooltip title="Detailed network connectivity metrics">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Connectivity Distribution
                </Typography>
                <Typography>
                  Max: {connectivityMetrics.maxConnections}
                  <br />
                  Min: {connectivityMetrics.minConnections}
                  <br />
                  Std Dev: {connectivityMetrics.stdDev.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Flow Metrics
                </Typography>
                <Typography>
                  Total Flow: {networkMetrics.totalFlow.toFixed(2)}
                  <br />
                  Average Flow: {networkMetrics.avgFlow.toFixed(2)}
                  <br />
                  Active Connections: {flows.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Integration Metrics
                </Typography>
                <Typography>
                  Network Density: {(networkMetrics.networkDensity * 100).toFixed(1)}%
                  <br />
                  Integration Score: {(networkMetrics.integrationScore * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {interpretNetworkMetrics(networkMetrics, connectivityMetrics)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Helper function to interpret network metrics
const interpretNetworkMetrics = (networkMetrics, connectivityMetrics) => {
  let interpretation = '';

  if (networkMetrics.integrationScore > 0.7) {
    interpretation = 'The market network shows strong integration with efficient price transmission between regions. ';
  } else if (networkMetrics.integrationScore > 0.4) {
    interpretation = 'The market network shows moderate integration with some barriers to price transmission. ';
  } else {
    interpretation = 'The market network shows limited integration with significant barriers to trade. ';
  }

  if (networkMetrics.flowDensity > 0.6) {
    interpretation += 'High market connectivity suggests robust trade networks. ';
  } else if (networkMetrics.flowDensity > 0.3) {
    interpretation += 'Moderate market connectivity indicates developing trade relationships. ';
  } else {
    interpretation += 'Low market connectivity suggests fragmented trade networks. ';
  }

  if (connectivityMetrics.stdDev / connectivityMetrics.avgConnections > 0.5) {
    interpretation += 'High variation in market connections indicates uneven market access.';
  } else {
    interpretation += 'Even distribution of market connections suggests balanced market access.';
  }

  return interpretation;
};

export default React.memo(NetworkMetrics);