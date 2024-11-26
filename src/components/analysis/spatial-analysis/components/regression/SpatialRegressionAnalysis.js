// src/components/analysis/spatial-analysis/components/regression/SpatialRegressionAnalysis.js

import React, { useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box
} from '@mui/material';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { calculateSpatialRegression } from '../../utils/regressionAnalysis';
import RegressionDiagnostics from './RegressionDiagnostics';
import ResidualMap from './ResidualMap';

const SpatialRegressionAnalysis = ({ spatialData, timeSeriesData, geometry }) => {
  const theme = useTheme();

  const regressionResults = useMemo(() => {
    if (!spatialData || !timeSeriesData) return null;
    
    return calculateSpatialRegression(
      timeSeriesData,
      spatialData.marketIntegration,
      spatialData.spatialAutocorrelation
    );
  }, [spatialData, timeSeriesData]);

  if (!regressionResults) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No data available for spatial regression analysis.</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Regression Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Spatial Price Transmission Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Variable</TableCell>
                      <TableCell align="right">Coefficient</TableCell>
                      <TableCell align="right">Std. Error</TableCell>
                      <TableCell align="right">t-value</TableCell>
                      <TableCell align="right">p-value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {regressionResults.coefficients.map((coef, index) => (
                      <TableRow key={coef.variable}>
                        <TableCell>{coef.variable}</TableCell>
                        <TableCell align="right">
                          {coef.estimate.toFixed(3)}
                        </TableCell>
                        <TableCell align="right">
                          {coef.stdError.toFixed(3)}
                        </TableCell>
                        <TableCell align="right">
                          {coef.tValue.toFixed(3)}
                        </TableCell>
                        <TableCell align="right">
                          {coef.pValue.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Model Statistics
                  </Typography>
                  <Typography variant="body2">
                    R²: {regressionResults.r2.toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    Adjusted R²: {regressionResults.adjustedR2.toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    Log Likelihood: {regressionResults.logLikelihood.toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    AIC: {regressionResults.aic.toFixed(3)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Residual Map */}
      <Grid item xs={12} md={6}>
        <ResidualMap 
          residuals={regressionResults.residuals}
          geometry={geometry}
        />
      </Grid>

      {/* Regression Diagnostics */}
      <Grid item xs={12} md={6}>
        <RegressionDiagnostics 
          results={regressionResults}
          spatialData={spatialData}
        />
      </Grid>

      {/* Price Transmission Visualization */}
      <Grid item xs={12}>
        <PriceTransmissionNetwork 
          results={regressionResults}
          spatialData={spatialData}
        />
      </Grid>
    </Grid>
  );
};

// Price Transmission Network Component
const PriceTransmissionNetwork = ({ results, spatialData }) => {
  const theme = useTheme();
  
  const transmissionData = useMemo(() => {
    return calculateTransmissionEffects(results, spatialData);
  }, [results, spatialData]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Price Transmission Network
      </Typography>
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="distance"
              name="Geographic Distance"
              label={{ value: "Geographic Distance (km)", position: "bottom" }}
            />
            <YAxis 
              dataKey="transmission"
              name="Price Transmission"
              label={{ 
                value: "Price Transmission Coefficient", 
                angle: -90, 
                position: "insideLeft" 
              }}
            />
            <Tooltip 
              formatter={(value, name) => [
                value.toFixed(3),
                name === "transmission" ? "Transmission Effect" : "Distance"
              ]}
            />
            <Legend />
            <Scatter
              name="Market Pairs"
              data={transmissionData}
              fill={theme.palette.primary.main}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Box>
      <TransmissionSummary data={transmissionData} />
    </Paper>
  );
};

// Transmission Summary Component
const TransmissionSummary = ({ data }) => {
  const metrics = useMemo(() => {
    const transmissionValues = data.map(d => d.transmission);
    const distances = data.map(d => d.distance);
    
    return {
      avgTransmission: mean(transmissionValues),
      maxTransmission: Math.max(...transmissionValues),
      minTransmission: Math.min(...transmissionValues),
      distanceDecay: calculateDistanceDecay(data),
      thresholdDistance: findThresholdDistance(data)
    };
  }, [data]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Transmission Metrics
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Typography variant="body2">
            Average Transmission: {metrics.avgTransmission.toFixed(3)}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="body2">
            Distance Decay: {metrics.distanceDecay.toFixed(3)}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="body2">
            Threshold Distance: {metrics.thresholdDistance.toFixed(1)} km
          </Typography>
        </Grid>
      </Grid>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {interpretTransmissionResults(metrics)}
      </Typography>
    </Box>
  );
};

// Helper functions
const calculateDistanceDecay = (data) => {
  // Calculate the rate at which price transmission decreases with distance
  const xValues = data.map(d => Math.log(d.distance));
  const yValues = data.map(d => Math.log(d.transmission));
  
  // Simple linear regression on log-transformed values
  const { slope } = linearRegression(xValues, yValues);
  return Math.exp(slope);
};

const findThresholdDistance = (data) => {
  // Find distance at which transmission effect falls below significant level
  const SIGNIFICANCE_THRESHOLD = 0.2;
  
  const sortedData = [...data].sort((a, b) => a.distance - b.distance);
  for (let point of sortedData) {
    if (point.transmission < SIGNIFICANCE_THRESHOLD) {
      return point.distance;
    }
  }
  return sortedData[sortedData.length - 1].distance;
};

const interpretTransmissionResults = (metrics) => {
  let interpretation = "";
  
  if (metrics.avgTransmission > 0.7) {
    interpretation = "Strong price transmission across markets indicates high market integration. ";
  } else if (metrics.avgTransmission > 0.4) {
    interpretation = "Moderate price transmission suggests partial market integration. ";
  } else {
    interpretation = "Weak price transmission indicates market segmentation. ";
  }

  if (metrics.distanceDecay > 0.9) {
    interpretation += "Distance has a strong limiting effect on price transmission. ";
  } else if (metrics.distanceDecay > 0.5) {
    interpretation += "Distance moderately affects price transmission. ";
  } else {
    interpretation += "Distance has limited impact on price transmission. ";
  }

  return interpretation;
};

export default SpatialRegressionAnalysis;