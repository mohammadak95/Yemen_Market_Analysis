import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../../../styles/analysisStyles';

const ModelDiagnostics = ({ intercept, coefficients, moranI, rSquared, observations }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  return (
    <Accordion sx={{ mt: 3 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="model-diagnostics-content"
        id="model-diagnostics-header"
      >
        <Typography variant="h6">Model Diagnostics</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {/* Model Equation */}
          <Grid item xs={12}>
            <Paper sx={styles.contentSection}>
              <Typography variant="subtitle1" gutterBottom>
                Model Equation
              </Typography>
              <Box 
                component="code" 
                sx={{ 
                  display: 'block',
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  fontSize: '1rem',
                  overflow: 'auto'
                }}
              >
                Price = {intercept.toFixed(4)} + {coefficients.spatial_lag_price.toFixed(4)} × Spatial_Lag
              </Box>
            </Paper>
          </Grid>

          {/* Statistical Interpretation */}
          <Grid item xs={12}>
            <Paper sx={styles.interpretationCard}>
              <Typography variant="subtitle1" gutterBottom>
                Statistical Interpretation
              </Typography>
              <Typography variant="body1" paragraph>
                • The spatial lag coefficient of {coefficients.spatial_lag_price.toFixed(4)} indicates
                that {coefficients.spatial_lag_price > 0 ? 'positive' : 'negative'} spatial dependence
                exists in commodity prices across regions.
              </Typography>
              <Typography variant="body1" paragraph>
                • The model explains {(rSquared * 100).toFixed(2)}% of the variance in prices
                across {observations} observations.
              </Typography>
              <Typography variant="body1">
                • Moran's I of {moranI.I.toFixed(4)} (p-value: {moranI["p-value"].toExponential(2)})
                suggests {moranI.I > 0 ? 'positive' : 'negative'} spatial autocorrelation
                {moranI["p-value"] < 0.05 ? ' (statistically significant)' : ' (not statistically significant)'}.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

ModelDiagnostics.propTypes = {
  intercept: PropTypes.number.isRequired,
  coefficients: PropTypes.shape({
    spatial_lag_price: PropTypes.number.isRequired
  }).isRequired,
  moranI: PropTypes.shape({
    I: PropTypes.number.isRequired,
    "p-value": PropTypes.number.isRequired
  }).isRequired,
  rSquared: PropTypes.number.isRequired,
  observations: PropTypes.number.isRequired
};

export default ModelDiagnostics;