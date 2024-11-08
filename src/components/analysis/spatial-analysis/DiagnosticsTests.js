import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Box,
  Grid,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Hub,
  Timeline,
  Speed,
  CompareArrows
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';

const DiagnosticMetric = ({ label, value, threshold, icon: Icon, tooltipText }) => (
  <Tooltip title={tooltipText}>
    <Box>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {label}
      </Typography>
      <Chip
        icon={<Icon />}
        label={typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value}
        color={value > threshold ? "success" : "warning"}
        size="small"
      />
    </Box>
  </Tooltip>
);

const SpatialDiagnostics = ({
  data,
  selectedMonth,
  selectedRegion,
  marketClusters,
  shocks
}) => {
  const {
    spatialMetrics,
    marketMetrics,
    diagnosticResults,
    trendAnalysis
  } = useMemo(() => {
    if (!data) return {};

    // Spatial correlation metrics
    const spatialMetrics = {
      moranI: data.moran_i?.I || 0,
      spatialLag: data.coefficients?.spatial_lag_price || 0,
      rSquared: data.r_squared || 0,
      significance: data.moran_i?.['p-value'] < 0.05
    };

    // Market integration metrics
    const marketMetrics = {
      efficiency: data.r_squared || 0,
      transmission: data.coefficients?.spatial_lag_price || 0,
      coverage: marketClusters?.length / (Object.keys(data.weights || {}).length || 1) || 0
    };

    // Diagnostic test results
    const diagnosticResults = {
      observations: data.observations,
      mse: data.mse,
      vif: data.vif?.map(v => ({
        variable: v.Variable,
        value: v.VIF
      })) || []
    };

    // Trend analysis
    const residuals = data.residual || [];
    const trendAnalysis = {
      mean: residuals.reduce((sum, r) => sum + r.residual, 0) / residuals.length,
      volatility: Math.sqrt(
        residuals.reduce((sum, r) => sum + Math.pow(r.residual, 0), 0) / residuals.length
      ),
      direction: residuals[residuals.length - 1]?.residual > 0 ? 'positive' : 'negative'
    };

    return {
      spatialMetrics,
      marketMetrics,
      diagnosticResults,
      trendAnalysis
    };
  }, [data, marketClusters]);

  if (!data) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Market Diagnostics
        {selectedRegion && ` - ${selectedRegion}`}
      </Typography>

      {/* Market Integration Summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <DiagnosticMetric
            label="Spatial Correlation"
            value={spatialMetrics.moranI}
            threshold={0.3}
            icon={spatialMetrics.moranI > 0 ? TrendingUp : TrendingDown}
            tooltipText="Measure of spatial price correlation"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DiagnosticMetric
            label="Price Transmission"
            value={marketMetrics.transmission}
            threshold={0.5}
            icon={Speed}
            tooltipText="Speed of price transmission between markets"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DiagnosticMetric
            label="Market Coverage"
            value={marketMetrics.coverage}
            threshold={0.6}
            icon={Hub}
            tooltipText="Market coverage and connectivity"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DiagnosticMetric
            label="Model Fit"
            value={marketMetrics.efficiency}
            threshold={0.3}
            icon={CheckCircle}
            tooltipText="Overall model fit quality"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Market Health Indicators */}
      {shocks?.length > 0 && (
        <Alert 
          severity={shocks.some(s => s.severity === 'high') ? "error" : "warning"}
          sx={{ mb: 2 }}
        >
          <AlertTitle>Market Shocks Detected</AlertTitle>
          {shocks.length} shock event(s) detected in the current period
        </Alert>
      )}

      {/* Diagnostic Statistics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Spatial Lag</TableCell>
                  <TableCell align="right">
                    {spatialMetrics.spatialLag.toFixed(4)}
                  </TableCell>
                  <TableCell align="right">
                    {spatialMetrics.significance ? 
                      <CheckCircle color="success" /> : 
                      <Warning color="warning" />
                    }
                  </TableCell>
                </TableRow>
                {diagnosticResults.vif.map((v, index) => (
                  <TableRow key={index}>
                    <TableCell>{`VIF (${v.variable})`}</TableCell>
                    <TableCell align="right">{v.value.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={v.value < 5 ? "Good" : "High"}
                        color={v.value < 5 ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Trend Visualization */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: 200 }}>
            <Line
              data={{
                labels: data.residual?.map(r => r.date) || [],
                datasets: [{
                  label: 'Residuals',
                  data: data.residual?.map(r => r.residual) || [],
                  borderColor: theme => theme.palette.primary.main,
                  backgroundColor: theme => theme.palette.primary.light,
                  fill: true
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    display: false
                  }
                }
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      'p-value': PropTypes.number,
    }),
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
    observations: PropTypes.number,
    mse: PropTypes.number,
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number,
      intercept: PropTypes.number
    }),
    p_values: PropTypes.object,
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string,
      date: PropTypes.string,
      residual: PropTypes.number
    })),
    vif: PropTypes.arrayOf(PropTypes.shape({
      Variable: PropTypes.string,
      VIF: PropTypes.number
    }))
  }),
  selectedMonth: PropTypes.string,
  selectedRegion: PropTypes.string,
  marketClusters: PropTypes.arrayOf(PropTypes.shape({
    mainMarket: PropTypes.string.isRequired,
    connectedMarkets: PropTypes.instanceOf(Set).isRequired,
    marketCount: PropTypes.number.isRequired,
    avgFlow: PropTypes.number,
    totalFlow: PropTypes.number
  })),
  shocks: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    magnitude: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    severity: PropTypes.string.isRequired
  }))
};

export default React.memo(SpatialDiagnostics);