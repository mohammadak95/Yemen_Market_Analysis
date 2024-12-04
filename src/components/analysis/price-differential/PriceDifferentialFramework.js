//src/components/analysis/price-differential/PriceDifferentialFramework.js

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton
} from '@mui/material';
import { ExpandMore, Info } from '@mui/icons-material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const PriceDifferentialFramework = ({ baseMarket, comparisonMarket, regressionResults, diagnostics }) => {
  const [frameworkExpanded, setFrameworkExpanded] = useState(false);

  return (
    <Accordion 
      expanded={frameworkExpanded} 
      onChange={() => setFrameworkExpanded(!frameworkExpanded)}
      sx={{ mb: 3 }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 1 }}>Price Differential Model Framework</Typography>
          <Tooltip title="Click to expand for detailed model explanation">
            <Info fontSize="small" color="action" />
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ '& .katex': { fontSize: '1.3em' } }}>
          {/* Logarithmic Price Differential */}
          <Typography variant="h6" color="primary" gutterBottom>
            Logarithmic Price Differential:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`PD_{ij,t} = \ln(P_{i,t}) - \ln(P_{j,t})`} />
          </Box>

          {/* Time Series Regression */}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 4 }}>
            Time Series Regression Model:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`PD_{ij,t} = \alpha + \beta t + \gamma CI_{t} + \epsilon_t`} />
          </Box>

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  α (Alpha) = {regressionResults?.intercept?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Base price differential between markets, representing structural differences
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  β (Beta) = {regressionResults?.slope?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Time trend coefficient, indicating systematic changes in market integration
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Distance Effect
                </Typography>
                <Typography variant="body2">
                  {`${diagnostics?.distance_km?.toFixed(1) || 'N/A'} km between markets`}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Variable Definitions:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • <InlineMath math="PD_{ij,t}" />: Price differential between markets i and j at time t<br />
                  • <InlineMath math="P_{i,t}, P_{j,t}" />: Prices in markets i and j at time t<br />
                  • <InlineMath math="\alpha" />: Base price differential (intercept)
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • <InlineMath math="\beta" />: Time trend coefficient<br />
                  • <InlineMath math="CI_{t}" />: Conflict intensity at time t<br />
                  • <InlineMath math="\epsilon_t" />: Random error term
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Model Properties:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • R-squared: {(regressionResults?.r_squared * 100).toFixed(1)}%<br />
                  • AIC: {regressionResults?.aic?.toFixed(2) || 'N/A'}<br />
                  • BIC: {regressionResults?.bic?.toFixed(2) || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • Conflict Correlation: {(diagnostics?.conflict_correlation * 100).toFixed(1)}%<br />
                  • Time Periods: {diagnostics?.common_dates || 'N/A'}<br />
                  • Statistical Significance: {regressionResults?.p_value < 0.05 ? 'Significant' : 'Not Significant'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default PriceDifferentialFramework;