import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { useSelector } from 'react-redux';
import { selectSpatialDataOptimized } from '../../../selectors/optimizedSelectors';

const SpatialFramework = ({ selectedData }) => {
  const [frameworkExpanded, setFrameworkExpanded] = useState(false);
  const theme = useTheme();
  const spatialData = useSelector(selectSpatialDataOptimized);

  const renderMethodBox = (title, content, mathContent = null) => (
    <Box sx={{ 
      p: 2, 
      bgcolor: theme.palette.background.default,
      borderRadius: 1,
      height: '100%',
      '&:hover .method-info': {
        opacity: 1
      }
    }}>
      <Typography variant="subtitle1" color="primary" gutterBottom>
        {title}
      </Typography>
      {mathContent && (
        <Box sx={{ my: 2 }}>
          <BlockMath math={mathContent} />
        </Box>
      )}
      <Typography variant="body2">
        {content}
      </Typography>
    </Box>
  );

  return (
    <Accordion 
      expanded={frameworkExpanded} 
      onChange={() => setFrameworkExpanded(!frameworkExpanded)}
      sx={{ mb: 3 }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMore />}
        sx={{
          backgroundColor: theme.palette.grey[50],
          '&:hover': {
            backgroundColor: theme.palette.grey[100],
          }
        }}
      >
        <Typography variant="h6">
          Spatial Market Integration Model Framework
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 3 }}>
        <Box sx={{ '& .katex': { fontSize: '1.3em' } }}>
          {/* Core Framework */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Market Integration Model
            </Typography>
            <Box sx={{ my: 3 }}>
              <BlockMath math={`P_i = \\alpha + \\rho(WP)_i + \\gamma CI_i + \\epsilon_i`} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Where <InlineMath math="P_i" /> is the price in region i, <InlineMath math="(WP)_i" /> represents neighboring prices,
              <InlineMath math="CI_i" /> is conflict intensity, and <InlineMath math="\epsilon_i" /> captures unexplained variations.
            </Typography>
          </Paper>

          {/* Methodology Components */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              {renderMethodBox(
                "Spatial Weights Matrix",
                "Defines market connectivity based on geographical proximity and trade routes.",
                `W_{ij} = \\begin{cases} 
                  1 & \\text{if } j \\text{ is connected to } i \\\\
                  0 & \\text{otherwise}
                \\end{cases}`
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              {renderMethodBox(
                "Price Spillovers",
                "Measures how price changes in one market affect neighboring regions.",
                `(WP)_i = \\sum_{j=1}^n W_{ij}P_j`
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              {renderMethodBox(
                "Conflict Impact",
                "Incorporates conflict intensity's effect on market connections.",
                `CI_i = f(\\text{events}, \\text{intensity}, \\text{duration})`
              )}
            </Grid>
          </Grid>

          {/* Model Parameters */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: theme.palette.grey[50] }}>
            <Typography variant="h6" gutterBottom>
              Key Parameters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" color="primary">
                    ρ = {selectedData?.coefficients?.spatial_lag_price?.toFixed(4) || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Spatial dependence coefficient measuring market integration strength
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" color="primary">
                    I = {selectedData?.moran_i?.I?.toFixed(4) || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Moran's I indicating spatial price clustering patterns
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" color="primary">
                    γ = {selectedData?.coefficients?.conflict_intensity?.toFixed(4) || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Conflict impact coefficient on price dynamics
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Model Properties */}
          <Paper sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
            <Typography variant="h6" gutterBottom>
              Technical Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  • Seasonal adjustment removes cyclical patterns<br />
                  • Robust to heteroskedasticity in conflict zones<br />
                  • Controls for spatial autocorrelation bias
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  • Ridge regression handles multicollinearity<br />
                  • Spatial error correction for local shocks<br />
                  • MSE: {selectedData?.mse?.toFixed(4) || 'N/A'} (model precision)
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

SpatialFramework.propTypes = {
  selectedData: PropTypes.shape({
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number,
      conflict_intensity: PropTypes.number
    }),
    moran_i: PropTypes.shape({
      I: PropTypes.number
    }),
    mse: PropTypes.number
  }).isRequired
};

export default SpatialFramework;
