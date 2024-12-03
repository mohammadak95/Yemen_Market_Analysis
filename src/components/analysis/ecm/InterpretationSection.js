// src/components/analysis/ecm/InterpretationSection.js

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const InterpretationSection = ({ selectedData }) => {
  if (!selectedData) {
    return (
      <Typography variant="body2" color="text.secondary">
        No interpretation data available.
      </Typography>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Interpretation of ECM Analysis Results
      </Typography>

      {/* 1. Key Coefficients Interpretation */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          1. Key Coefficients Interpretation
        </Typography>

        {/* Alpha (α) — Speed of Adjustment */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Alpha (α) — Speed of Adjustment
          </Typography>
          <Typography variant="body2" paragraph>
            Alpha represents the speed at which commodity prices adjust to restore long-run equilibrium after a short-term shock. A negative and significant α indicates that when prices deviate from their long-term equilibrium due to a shock (e.g., sudden conflict escalation), they will gradually return to equilibrium.
          </Typography>
          <Typography variant="body2" paragraph>
            For instance, an α of <strong>{selectedData.alpha.toFixed(4)}</strong> suggests that approximately <strong>{Math.abs(selectedData.alpha * 100).toFixed(2)}%</strong> of the disequilibrium is corrected each period. This implies a {Math.abs(selectedData.alpha) > 0.5 ? 'rapid' : 'moderate'} speed of adjustment, where markets are {Math.abs(selectedData.alpha) > 0.5 ? 'highly responsive' : 'responsive but may take several periods to fully adjust'}.
          </Typography>
        </Box>

        {/* Beta (β) — Long-Run Relationship */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Beta (β) — Long-Run Relationship
          </Typography>
          <Typography variant="body2" paragraph>
            Beta captures the equilibrium relationship between commodity prices and conflict intensity in the long run. A β of <strong>{selectedData.beta.toFixed(4)}</strong> indicates a strong positive long-term relationship between conflict intensity and commodity prices.
          </Typography>
          <Typography variant="body2" paragraph>
            This suggests that sustained increases in conflict intensity are associated with significant increases in commodity prices, highlighting the profound impact of prolonged conflict on market conditions.
          </Typography>
        </Box>

        {/* Gamma (γ) — Short-Run Dynamics */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Gamma (γ) — Short-Run Dynamics
          </Typography>
          <Typography variant="body2" paragraph>
            Gamma measures the immediate effect of changes in conflict intensity on commodity prices, reflecting short-term adjustments. A γ of <strong>{selectedData.gamma.toFixed(4)}</strong> denotes a substantial short-term impact.
          </Typography>
          <Typography variant="body2" paragraph>
            Sudden changes in conflict intensity lead to immediate and significant fluctuations in prices. This reflects market sensitivity to current events, where traders and consumers quickly react to new information regarding conflict developments.
          </Typography>
        </Box>
      </Box>

      {/* 2. Impulse Response Function (IRF) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          2. Impulse Response Function (IRF)
        </Typography>
        <Typography variant="body2" paragraph>
          The IRF illustrates how commodity prices respond over time to a one-time shock in conflict intensity.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Immediate Impact:</strong> The IRF shows that following a shock, prices increase sharply, peaking within the first period.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Adjustment Path:</strong> After the initial spike, prices gradually decrease, moving back towards the long-run equilibrium.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Economic Insight:</strong> This pattern underscores both the immediate and lasting effects of conflict on prices. The quick spike reflects panic or supply chain disruptions, while the gradual decline indicates market adaptation over time.
        </Typography>
      </Box>

      {/* 3. Autocorrelation Functions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          3. Autocorrelation Functions
        </Typography>

        {/* Autocorrelation Function (ACF) */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Autocorrelation Function (ACF)
          </Typography>
          <Typography variant="body2" paragraph>
            ACF measures the correlation of a variable with its own past values over different time lags.
          </Typography>
          <Typography variant="body2" paragraph>
            Significant autocorrelations at initial lags suggest that current commodity prices are influenced by recent past prices. This indicates price momentum and potential predictability in short-term price movements.
          </Typography>
        </Box>

        {/* Partial Autocorrelation Function (PACF) */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Partial Autocorrelation Function (PACF)
          </Typography>
          <Typography variant="body2" paragraph>
            PACF measures the correlation between a variable and its lagged values, controlling for the values at shorter lags.
          </Typography>
          <Typography variant="body2" paragraph>
            Significant PACF at lag one implies that the immediate past price is a strong predictor of the current price. This highlights the importance of including lagged price terms in the model to capture short-term dynamics.
          </Typography>
        </Box>
      </Box>

      {/* 4. Model Diagnostics */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          4. Model Diagnostics
        </Typography>

        {/* AIC and BIC Scores */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            AIC and BIC Scores
          </Typography>
          <Typography variant="body2" paragraph>
            Measures used to assess model fit while penalizing complexity. Lower Akaike Information Criterion (AIC) and Bayesian Information Criterion (BIC) values indicate a better-fitting model. The reported scores suggest that the ECM balances goodness-of-fit with parsimony effectively.
          </Typography>
        </Box>

        {/* Durbin-Watson Statistic */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Durbin-Watson Statistic
          </Typography>
          <Typography variant="body2" paragraph>
            Tests for autocorrelation in the residuals of a regression. A value close to <strong>2</strong> suggests no significant autocorrelation. This indicates that the model's residuals are randomly distributed, satisfying a key regression assumption.
          </Typography>
        </Box>

        {/* Jarque-Bera Test */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Jarque-Bera Test
          </Typography>
          <Typography variant="body2" paragraph>
            A test for normality of residuals based on skewness and kurtosis. A high p-value implies that residuals are normally distributed. Normality of residuals validates the use of statistical inference in the model.
          </Typography>
        </Box>
      </Box>

      {/* Conclusions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Conclusions
        </Typography>
        <Typography variant="body2" paragraph>
          The ECM analysis reveals a strong and significant relationship between conflict intensity and commodity prices in Yemen. Both immediate shocks and long-term trends in conflict levels have profound effects on market dynamics. The findings highlight the critical interplay between socio-political stability and economic well-being, emphasizing the necessity for integrated policies that address both economic and security challenges.
        </Typography>
      </Box>
    </Paper>
  );
};

InterpretationSection.propTypes = {
  selectedData: PropTypes.shape({
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
    irf: PropTypes.object,
    diagnostics: PropTypes.object,
    aic: PropTypes.number,
    bic: PropTypes.number,
  }).isRequired,
};

export default InterpretationSection;