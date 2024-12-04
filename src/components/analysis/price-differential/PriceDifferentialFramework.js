// src/components/analysis/price-differential/PriceDifferentialFramework.js

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
} from '@mui/material';
import { ExpandMore, Info } from '@mui/icons-material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const PriceDifferentialFramework = ({ 
  baseMarket, 
  comparisonMarket, 
  regressionResults, 
  diagnostics,
  expanded,
  onExpandedChange 
}) => {
  return (
    <Accordion 
      expanded={expanded} 
      onChange={onExpandedChange}
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
          {/* Price Differential Equation */}
          <Typography variant="h6" color="primary" gutterBottom>
            Price Differential Formula:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`PD_{ij,t} = \ln(P_{i,t}) - \ln(P_{j,t})`} />
          </Box>

          {/* Regression Model */}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 4 }}>
            Regression Model:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`PD_{ij,t} = \alpha + \beta_1 Distance_{ij} + \beta_2 Conflict_t + \gamma T_t + \epsilon_t`} />
          </Box>

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  α (Alpha) = {regressionResults?.intercept?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Base price differential between markets
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  β₁ (Distance Effect) = {regressionResults?.beta_distance?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Impact of geographical distance on price differences
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  β₂ (Conflict Effect) = {regressionResults?.beta_conflict?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Impact of conflict on market integration
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
                  • <InlineMath math="Distance_{ij}" />: Physical distance between markets
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • <InlineMath math="Conflict_t" />: Conflict intensity at time t<br />
                  • <InlineMath math="T_t" />: Time trend<br />
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
                  • Distance: {diagnostics?.distance_km?.toFixed(1)} km
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • Conflict Impact: {(diagnostics?.conflict_correlation * 100).toFixed(1)}%<br />
                  • Time Periods: {diagnostics?.common_dates || 'N/A'}<br />
                  • Significance: {regressionResults?.p_value < 0.05 ? 'Significant' : 'Not Significant'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default React.memo(PriceDifferentialFramework);