//src/components/analysis/spatial/SpatialFramework.js

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

const SpatialFramework = ({ selectedData }) => {
  const [frameworkExpanded, setFrameworkExpanded] = useState(false);

  return (
    <Accordion 
      expanded={frameworkExpanded} 
      onChange={() => setFrameworkExpanded(!frameworkExpanded)}
      sx={{ mb: 3 }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 1 }}>Spatial Analysis Framework</Typography>
          <Tooltip title="Click to expand for detailed model explanation">
            <Info fontSize="small" color="action" />
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ '& .katex': { fontSize: '1.3em' } }}>
          {/* Spatial Weights Matrix */}
          <Typography variant="h6" color="primary" gutterBottom>
            Spatial Weights Matrix (K-Nearest Neighbors):
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`W_{ij} = \\begin{cases} 
              1 & \\text{if } j \\text{ is among } k \\text{ nearest neighbors of } i \\\\
              0 & \\text{otherwise}
            \\end{cases}`} />
          </Box>

          {/* Spatial Lag */}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 4 }}>
            Spatial Lag of Prices:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`(WP)_i = \\sum_{j=1}^n W_{ij}P_j`} />
          </Box>

          {/* Spatial Regression Model */}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 4 }}>
            Ridge Regression with Spatial Components:
          </Typography>
          <Box sx={{ my: 3 }}>
            <BlockMath math={`P_i = \\alpha + \\beta(WP)_i + \\gamma CI_i + \\epsilon_i`} />
          </Box>

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  β (Beta) = {selectedData?.coefficients?.spatial_lag_price?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Spatial dependence coefficient, measuring price spillover effects
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Moran's I = {selectedData?.moran_i?.I?.toFixed(4) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Measure of spatial autocorrelation in price patterns
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  R² = {(selectedData?.r_squared * 100)?.toFixed(1) || 'N/A'}%
                </Typography>
                <Typography variant="body2">
                  Model fit, explaining variation in spatial price patterns
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
                  • <InlineMath math="W_{ij}" />: Spatial weights matrix element<br />
                  • <InlineMath math="P_i" />: Price in region i<br />
                  • <InlineMath math="(WP)_i" />: Spatial lag of prices
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • <InlineMath math="CI_i" />: Conflict intensity in region i<br />
                  • <InlineMath math="\beta" />: Spatial spillover coefficient<br />
                  • <InlineMath math="\epsilon_i" />: Random error term
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
                  • Seasonal Adjustment: Removes cyclical price patterns<br />
                  • Smoothing: Reduces short-term price volatility<br />
                  • Ridge Regression: Controls for multicollinearity
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  • VIF: Checks for multicollinearity<br />
                  • Moran's I: Tests spatial autocorrelation<br />
                  • MSE: {selectedData?.mse?.toFixed(4) || 'N/A'} (Model error)
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default SpatialFramework;
