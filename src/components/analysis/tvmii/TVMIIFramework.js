// src/components/analysis/tvmii/TVMIIFramework.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  useTheme,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const TVMIIFramework = ({ data }) => {
  const theme = useTheme();

  return (
    <Box sx={{ '& .katex': { fontSize: '1.3em' } }}>
      {/* Core Framework */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
          Time-Varying Market Integration Index Model
        </Typography>
        <Box sx={{ my: 3 }}>
          <BlockMath math={`MII_t = \\frac{1}{N} \\sum_{i=1}^N \\sum_{j=1}^N w_{ij} \\rho_{ij,t}`} />
        </Box>
        <Typography variant="body2" paragraph>
          Where <InlineMath math="MII_t" /> is the market integration index at time t, 
          <InlineMath math="\\rho_{ij,t}" /> is the price correlation between markets i and j, 
          and <InlineMath math="w_{ij}" /> are spatial weights based on market distances
        </Typography>
      </Paper>

      {/* Methodology Components */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            height: '100%'
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Rolling Window Estimation
            </Typography>
            <Box sx={{ my: 2 }}>
              <BlockMath math={`\\rho_{ij,t} = corr(P_i, P_j)_{t-w:t}`} />
            </Box>
            <Typography variant="body2">
              Dynamic price correlations computed using a rolling window of w periods to capture temporal variations in market relationships
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            height: '100%'
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Spatial Weights
            </Typography>
            <Box sx={{ my: 2 }}>
              <BlockMath math={`w_{ij} = \\frac{1}{d_{ij}^\\alpha}`} />
            </Box>
            <Typography variant="body2">
              Distance-based weights capturing market connectivity and trade flows, where d_ij is the distance between markets
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            height: '100%'
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Conflict Adjustment
            </Typography>
            <Box sx={{ my: 2 }}>
              <BlockMath math={`\\rho_{ij,t}^* = \\rho_{ij,t} \\cdot (1 - CI_{ij,t})`} />
            </Box>
            <Typography variant="body2">
              Adjusts market correlations based on conflict intensity between market pairs to account for trade disruptions
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Model Properties */}
      <Paper sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
        <Typography variant="h6" gutterBottom>
          Model Properties
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Key Features:
            </Typography>
            <Typography variant="body2">
              • Dynamic measurement of market integration<br />
              • Accounts for spatial dependencies<br />
              • Incorporates conflict impacts<br />
              • Normalized index range: [0,1]
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Economic Implications:
            </Typography>
            <Typography variant="body2">
              • Higher values indicate stronger market integration<br />
              • Temporal variations reveal integration dynamics<br />
              • Distance decay affects integration strength<br />
              • Conflict reduces effective market connectivity
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

TVMIIFramework.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string,
    mii: PropTypes.number,
    window_size: PropTypes.number,
    conflict_adjusted: PropTypes.bool
  }))
};

export default TVMIIFramework;
