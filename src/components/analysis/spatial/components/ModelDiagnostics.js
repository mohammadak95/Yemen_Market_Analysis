// src/components/analysis/spatial/components/ModelDiagnostics.js

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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../../../styles/analysisStyles';

const ModelDiagnostics = ({ 
  intercept, 
  coefficients, 
  moranI, 
  rSquared, 
  observations, 
  vif = [] 
}) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  const significanceLevel = moranI['p-value'] < 0.05;
  const spatialDependence = moranI.I > 0 ? 'positive' : 'negative';

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
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  fontFamily: 'monospace'
                }}
              >
                Price = {intercept.toFixed(4)} + {coefficients.spatial_lag_price?.toFixed(4)} × Spatial_Lag
              </Box>
            </Paper>
          </Grid>

          {/* VIF Analysis */}
          {vif && vif.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={styles.contentSection}>
                <Typography variant="subtitle1" gutterBottom>
                  Variance Inflation Factors (VIF)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Variable</TableCell>
                        <TableCell align="right">VIF</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vif.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.Variable}</TableCell>
                          <TableCell align="right">{item.VIF.toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}

          {/* Statistical Interpretation */}
          <Grid item xs={12}>
            <Paper sx={styles.contentSection}>
              <Typography variant="subtitle1" gutterBottom>
                Statistical Interpretation
              </Typography>
              <Typography variant="body2" paragraph>
                • The spatial lag coefficient of {coefficients.spatial_lag_price?.toFixed(4)} indicates
                that {spatialDependence} spatial dependence exists in commodity prices across regions.
              </Typography>
              <Typography variant="body2" paragraph>
                • The model explains {(rSquared * 100).toFixed(2)}% of the variance in prices
                across {observations} observations.
              </Typography>
              <Typography variant="body2">
                • Moran's I of {moranI.I.toFixed(4)} (p-value: {moranI['p-value'].toExponential(2)})
                suggests {spatialDependence} spatial autocorrelation
                {significanceLevel ? ' (statistically significant)' : ' (not statistically significant)'}.
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
    spatial_lag_price: PropTypes.number
  }).isRequired,
  moranI: PropTypes.shape({
    I: PropTypes.number.isRequired,
    'p-value': PropTypes.number.isRequired
  }).isRequired,
  rSquared: PropTypes.number.isRequired,
  observations: PropTypes.number.isRequired,
  vif: PropTypes.arrayOf(PropTypes.shape({
    Variable: PropTypes.string,
    VIF: PropTypes.number
  }))
};

export default ModelDiagnostics;