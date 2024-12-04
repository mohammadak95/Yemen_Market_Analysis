// src/components/analysis/price-differential/PriceDifferentialFramework.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme
} from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const PriceDifferentialFramework = ({ 
  baseMarket, 
  comparisonMarket, 
  regressionResults, 
  diagnostics
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ '& .katex': { fontSize: '1.3em' } }}>
      {/* Price Differential Definition */}
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
        Price Differential Relationship:
      </Typography>
      <Box sx={{ my: 3 }}>
        <BlockMath math={`PD_{ij,t} = \ln(P_{i,t}) - \ln(P_{j,t})`} />
      </Box>
      <Typography variant="body2" sx={{ mb: 4 }}>
        Where <InlineMath math="PD_{ij,t}" /> represents the log price differential between {baseMarket} (i) and {comparisonMarket} (j) at time t
      </Typography>

      {/* Market Integration Model */}
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, mt: 4 }}>
        Market Integration Model:
      </Typography>
      <Box sx={{ my: 3 }}>
        <BlockMath math={`PD_{ij,t} = \alpha + \beta t + \gamma_1 Distance_{ij} + \gamma_2 Conflict_t + \epsilon_t`} />
      </Box>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Parameter Interpretations */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: theme.palette.background.default }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Market Integration Parameters
            </Typography>
            <Typography variant="body2" paragraph>
              • <InlineMath math="\alpha" /> = {regressionResults?.intercept?.toFixed(4) || 'N/A'}: Base price differential<br />
              • <InlineMath math="\beta" /> = {regressionResults?.slope?.toFixed(4) || 'N/A'}: Integration trend over time<br />
              • <InlineMath math="\gamma_1" /> = {regressionResults?.beta_distance?.toFixed(4) || 'N/A'}: Distance effect<br />
              • <InlineMath math="\gamma_2" /> = {regressionResults?.beta_conflict?.toFixed(4) || 'N/A'}: Conflict effect
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: theme.palette.background.default }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Market Characteristics
            </Typography>
            <Typography variant="body2" paragraph>
              • Distance: {diagnostics?.distance_km?.toFixed(2) || 'N/A'} km<br />
              • Conflict Correlation: {diagnostics?.conflict_correlation?.toFixed(2) || 'N/A'}<br />
              • Time Periods: {diagnostics?.common_dates || 'N/A'}<br />
              • Model Fit: {regressionResults?.r_squared ? `${(regressionResults.r_squared * 100).toFixed(1)}%` : 'N/A'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Variable Definitions */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          Variable Definitions:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              • <InlineMath math="PD_{ij,t}" />: Log price differential<br />
              • <InlineMath math="P_{i,t}, P_{j,t}" />: Market prices<br />
              • <InlineMath math="t" />: Time trend
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              • <InlineMath math="Distance_{ij}" />: Market separation (km)<br />
              • <InlineMath math="Conflict_t" />: Conflict intensity<br />
              • <InlineMath math="\epsilon_t" />: Error term
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Model Interpretation */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          Model Interpretation:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              • Negative β indicates price convergence<br />
              • Positive β suggests market divergence<br />
              • Distance effect shows spatial barriers
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">
              • Conflict correlation measures disruption<br />
              • R² indicates model explanatory power<br />
              • P-value shows statistical significance
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

PriceDifferentialFramework.propTypes = {
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  regressionResults: PropTypes.shape({
    intercept: PropTypes.number,
    slope: PropTypes.number,
    beta_distance: PropTypes.number,
    beta_conflict: PropTypes.number,
    r_squared: PropTypes.number
  }),
  diagnostics: PropTypes.shape({
    distance_km: PropTypes.number,
    conflict_correlation: PropTypes.number,
    common_dates: PropTypes.number
  })
};

export default React.memo(PriceDifferentialFramework);
