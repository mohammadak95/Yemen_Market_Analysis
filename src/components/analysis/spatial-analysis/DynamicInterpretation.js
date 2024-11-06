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

    // Macroeconomic Interpretation
    let macroInsight = '';
    if (moranIValue > 0 && pValue < 0.05) {
      macroInsight =
        'The positive spatial autocorrelation suggests that regions with high commodity prices are clustered together, possibly due to regional trade agreements or similar economic policies.';
    } else if (moranIValue < 0 && pValue < 0.05) {
      macroInsight =
        'The negative spatial autocorrelation indicates that high and low commodity prices are interspersed, potentially reflecting competitive markets or differing regional economic conditions.';
    } else {
      macroInsight =
        'There is no significant spatial autocorrelation, implying that commodity prices are randomly distributed across regions, possibly due to uniform economic policies or lack of regional interactions.';
    }

    return {
      summary: `${pattern.charAt(0).toUpperCase() + pattern.slice(1)} detected`,
      details: `Moran's I: ${moranIValue.toFixed(3)} (p-value: ${pValue.toFixed(
        3
      )}), indicating ${significance} spatial dependence.`,
      macroInsight,
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

    // Macroeconomic Interpretation
    let macroInsight = '';
    if (r_squared > 0.7) {
      macroInsight =
        'The model explains a large portion of the variance, indicating that the spatial factors are strong determinants of commodity prices.';
    } else if (r_squared > 0.5) {
      macroInsight =
        'The model has a good fit, suggesting that spatial dependencies play a significant role in influencing commodity prices.';
    } else {
      macroInsight =
        'The model has a moderate fit, implying that while spatial factors are relevant, other variables may also significantly impact commodity prices.';
    }

    return {
      summary: `${quality.charAt(0).toUpperCase() + quality.slice(1)} model fit`,
      details: `R²: ${r_squared.toFixed(3)}, Adjusted R²: ${adj_r_squared.toFixed(
        3
      )}, explaining ${(r_squared * 100).toFixed(1)}% of the variance.`,
      macroInsight,
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

    // Macroeconomic Interpretation
    let macroInsight = '';
    if (lagCoef > 0) {
      macroInsight =
        'A positive spatial lag coefficient indicates that an increase in commodity price in one region positively influences neighboring regions, suggesting interconnected markets.';
    } else {
      macroInsight =
        'A negative spatial lag coefficient implies that an increase in commodity price in one region negatively affects neighboring regions, potentially due to competitive pricing or substitution effects.';
    }

    return {
      summary: `Spatial price transmission is ${strength}`,
      details: `Spatial lag coefficient: ${lagCoef.toFixed(
        3
      )} (p-value: ${lagPValue.toFixed(3)}), indicating ${
        lagCoef > 0 ? 'positive' : 'negative'
      } transmission.`,
      macroInsight,
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
              <Typography variant="body2" gutterBottom>
                {analysis.macroInsight}
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
                . Based on {observations || 'unknown'} observations.
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default DynamicInterpretation;