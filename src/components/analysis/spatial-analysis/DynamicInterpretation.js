// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React from 'react';
import {
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  RadioButtonUnchecked,
  Hub,
  Functions,
  Analytics,
} from '@mui/icons-material';

const DynamicInterpretation = ({ data, spatialWeights, selectedMonth }) => {
  if (!data) return null;

  const {
    moran_i,
    r_squared,
    adj_r_squared,
    coefficients,
    residual,
    p_values,
    observations,
  } = data;

  const moranIValue = moran_i?.I || moran_i?.value;
  const pValue = moran_i?.['p-value'] || moran_i?.p_value;

  const getSpatialDependenceAnalysis = () => {
    if (moranIValue === undefined || pValue === undefined) {
      return null;
    }

    const significance =
      pValue < 0.05 ? 'statistically significant' : 'not statistically significant';
    const pattern =
      moranIValue > 0
        ? 'positive spatial autocorrelation'
        : moranIValue < 0
        ? 'negative spatial autocorrelation'
        : 'no spatial autocorrelation';

    return {
      summary: `${pattern.charAt(0).toUpperCase() + pattern.slice(1)} detected`,
      details: `Moran's I: ${moranIValue.toFixed(3)} (p-value: ${pValue.toFixed(
        3
      )}), indicating ${significance} spatial dependence.`,
      severity: pValue < 0.05 ? 'info' : 'warning',
      icon:
        moranIValue > 0 ? (
          <TrendingUp />
        ) : moranIValue < 0 ? (
          <TrendingDown />
        ) : (
          <RadioButtonUnchecked />
        ),
      chips: [pattern, significance],
    };
  };

  const getModelFitAnalysis = () => {
    if (r_squared === undefined) return null;

    const quality =
      r_squared > 0.7 ? 'excellent' : r_squared > 0.5 ? 'good' : 'moderate';

    return {
      summary: `${quality.charAt(0).toUpperCase() + quality.slice(1)} model fit`,
      details: `R²: ${r_squared.toFixed(3)}, Adjusted R²: ${adj_r_squared.toFixed(
        3
      )}, explaining ${(r_squared * 100).toFixed(1)}% of the variance.`,
      severity: r_squared > 0.5 ? 'success' : 'warning',
      icon: <Functions />,
      chips: [quality],
    };
  };

  const getSpatialRelationshipAnalysis = () => {
    if (!coefficients?.spatial_lag_price) return null;

    const lagCoef = coefficients.spatial_lag_price;
    const lagPValue = p_values?.spatial_lag_price;
    const strength =
      Math.abs(lagCoef) > 0.8
        ? 'strong'
        : Math.abs(lagCoef) > 0.5
        ? 'moderate'
        : 'weak';

    return {
      summary: `Spatial price transmission is ${strength}`,
      details: `Spatial lag coefficient: ${lagCoef.toFixed(
        3
      )} (p-value: ${lagPValue.toFixed(3)}), indicating ${
        lagCoef > 0 ? 'positive' : 'negative'
      } transmission.`,
      severity: Math.abs(lagCoef) > 0.5 ? 'success' : 'info',
      icon: <Hub />,
      chips: [strength, lagCoef > 0 ? 'positive' : 'negative'],
    };
  };

  const analyses = [
    getSpatialDependenceAnalysis(),
    getModelFitAnalysis(),
    getSpatialRelationshipAnalysis(),
  ].filter(Boolean);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dynamic Interpretation
      </Typography>

      <Grid container spacing={2}>
        {analyses.map((analysis, idx) => (
          <Grid item xs={12} key={idx}>
            <Alert severity={analysis.severity} icon={analysis.icon}>
              <AlertTitle>{analysis.summary}</AlertTitle>
              <Typography variant="body2" gutterBottom>
                {analysis.details}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {analysis.chips.map((chip, index) => (
                  <Chip
                    key={index}
                    label={chip}
                    size="small"
                    sx={{ mr: 0.5 }}
                  />
                ))}
              </Box>
            </Alert>
          </Grid>
        ))}

        {selectedMonth && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<Analytics />}>
              <AlertTitle>Current Period Analysis</AlertTitle>
              <Typography variant="body2">
                Analysis for{' '}
                {new Date(selectedMonth).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
                . Based on {observations} observations.
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default DynamicInterpretation;
