// src/components/analysis/ecm/ECMInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Grid,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { BlockMath } from 'react-katex';
import TechnicalTooltip from '../../common/TechnicalTooltip';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const ECMInterpretation = ({ results, selectedCommodity }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('ecm');

  const interpretAdjustmentSpeed = (alpha) => {
    const absAlpha = Math.abs(alpha);
    if (alpha > 0) {
      return {
        status: 'warning',
        message: 'Divergent adjustment process detected',
        icon: TrendingUp,
        detail: 'The positive adjustment coefficient suggests potential instability in the price relationship.',
      };
    }
    if (absAlpha < 0.1) {
      return {
        status: 'info',
        message: 'Slow adjustment to equilibrium',
        icon: TrendingDown,
        detail: `Markets take approximately ${Math.round(1/absAlpha)} periods to correct half of any deviation.`,
      };
    }
    return {
      status: 'success',
      message: 'Normal adjustment process',
      icon: Activity,
      detail: `Markets correct approximately ${(absAlpha * 100).toFixed(1)}% of deviations each period.`,
    };
  };

  const interpretCointegration = (pValue, tStat) => {
    if (pValue > 0.05) {
      return {
        status: 'warning',
        message: 'No strong evidence of cointegration',
        detail: 'The markets may not maintain a stable long-run price relationship.',
      };
    }
    return {
      status: 'success',
      message: 'Cointegrated price series',
      detail: 'The markets maintain a stable long-run price relationship.',
    };
  };

  const adjustmentInterpretation = interpretAdjustmentSpeed(results.alpha);
  const cointegrationInterpretation = interpretCointegration(
    results.cointegration_test?.p_value,
    results.cointegration_test?.t_statistic
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ECM Results Interpretation
        <TechnicalTooltip
          componentType="ecm"
          element="interpretation"
          tooltipContent={getTechnicalTooltip('interpretation')}
        />
      </Typography>

      {/* Key Findings */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Adjustment Process
                <TechnicalTooltip
                  componentType="ecm"
                  element="alpha"
                  tooltipContent={getTechnicalTooltip('alpha')}
                />
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <adjustmentInterpretation.icon 
                  color={theme.palette[adjustmentInterpretation.status].main} 
                  size={24}
                  style={{ marginRight: 8 }}
                />
                <Typography variant="body1">
                  {adjustmentInterpretation.message}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {adjustmentInterpretation.detail}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <BlockMath>
                  {`\\alpha = ${results.alpha.toFixed(4)}`}
                </BlockMath>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Long-run Relationship
                <TechnicalTooltip
                  componentType="ecm"
                  element="cointegration"
                  tooltipContent={getTechnicalTooltip('cointegration')}
                />
              </Typography>
              <Alert 
                severity={cointegrationInterpretation.status}
                sx={{ mb: 2 }}
              >
                {cointegrationInterpretation.message}
              </Alert>
              <Typography variant="body2">
                {cointegrationInterpretation.detail}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Implications */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Key Implications for {selectedCommodity}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              {results.alpha < 0 
                ? `Price deviations between markets are corrected at a rate of ${Math.abs(results.alpha * 100).toFixed(1)}% per period.`
                : 'The price adjustment process shows unusual behavior that may require further investigation.'}
            </Typography>
            {results.beta && (
              <Typography variant="body1" paragraph>
                A 1% change in conflict intensity is associated with a {(results.beta * 100).toFixed(1)}% change in price differentials in the long run.
              </Typography>
            )}
            {results.granger_causality && (
              <Typography variant="body1">
                {results.granger_causality.p_value < 0.05 
                  ? 'There is evidence of Granger causality from conflict to prices.'
                  : 'No clear evidence of Granger causality from conflict to prices.'}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Caveats and Assumptions */}
      {(results.alpha > 0 || results.diagnostics?.jarque_bera?.p_value < 0.05) && (
        <Alert 
          severity="warning" 
          icon={<AlertTriangle />}
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Important Considerations
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            {results.alpha > 0 && (
              <li>
                <Typography variant="body2">
                  The positive adjustment coefficient is unusual and may indicate model misspecification or complex market dynamics.
                </Typography>
              </li>
            )}
            {results.diagnostics?.jarque_bera?.p_value < 0.05 && (
              <li>
                <Typography variant="body2">
                  Non-normal residuals detected, which may affect the reliability of statistical inference.
                </Typography>
              </li>
            )}
          </Box>
        </Alert>
      )}
    </Box>
  );
};

ECMInterpretation.propTypes = {
  results: PropTypes.shape({
    alpha: PropTypes.number.isRequired,
    beta: PropTypes.number,
    cointegration_test: PropTypes.shape({
      p_value: PropTypes.number,
      t_statistic: PropTypes.number,
    }),
    granger_causality: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    diagnostics: PropTypes.object,
  }).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
};

export default ECMInterpretation;