// src/components/analysis/price-differential/InterpretationSection.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  Chip,
  useTheme
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';

const InterpretationSection = ({ data, baseMarket, comparisonMarket }) => {
  const theme = useTheme();

  if (!data) {
    return (
      <Alert severity="info">
        No data available for interpretation.
      </Alert>
    );
  }

  const sections = [
    {
      title: 'Market Integration Analysis',
      content: () => {
        const isIntegrated = data.cointegration_results?.p_value < 0.05;
        return {
          summary: isIntegrated 
            ? 'Markets show significant integration patterns'
            : 'Limited evidence of market integration',
          details: [
            `Integration Level: ${isIntegrated ? 'Strong' : 'Weak'}`,
            `Confidence: ${(1 - data.cointegration_results?.p_value) * 100}%`,
            `Long-run Relationship: ${isIntegrated ? 'Stable' : 'Unstable'}`
          ],
          status: isIntegrated ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Price Dynamics',
      content: () => {
        const hasStablePrice = data.stationarity_results?.adf_test?.p_value < 0.05;
        return {
          summary: hasStablePrice
            ? 'Price differentials show stability over time'
            : 'Price differentials exhibit volatile behavior',
          details: [
            `Stability: ${hasStablePrice ? 'Confirmed' : 'Not Confirmed'}`,
            `Mean Reversion: ${hasStablePrice ? 'Present' : 'Absent'}`,
            `Trend Behavior: ${hasStablePrice ? 'Stationary' : 'Non-stationary'}`
          ],
          status: hasStablePrice ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Market Barriers',
      content: () => {
        const distanceImpact = data.diagnostics?.distance_km * 250;
        const conflictImpact = data.diagnostics?.conflict_correlation;
        const hasSignificantBarriers = distanceImpact > 500 || conflictImpact > 0.5;
        
        return {
          summary: hasSignificantBarriers
            ? 'Significant market barriers detected'
            : 'Limited market barriers present',
          details: [
            `Distance Impact: ${distanceImpact > 500 ? 'High' : 'Moderate'}`,
            `Conflict Impact: ${conflictImpact > 0.5 ? 'Significant' : 'Limited'}`,
            `Market Access: ${hasSignificantBarriers ? 'Restricted' : 'Open'}`
          ],
          status: hasSignificantBarriers ? 'warning' : 'success'
        };
      }
    }
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        {sections.map((section) => {
          const interpretation = section.content();
          return (
            <Grid item xs={12} key={section.title}>
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2 
                }}>
                  <Typography variant="h6" gutterBottom>
                    {section.title}
                  </Typography>
                  <Chip
                    icon={interpretation.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                    label={interpretation.status === 'success' ? 'Positive' : 'Attention Needed'}
                    color={interpretation.status}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body1" paragraph>
                  {interpretation.summary}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {interpretation.details.map((detail, index) => (
                    <Chip
                      key={index}
                      label={detail}
                      size="small"
                      variant="outlined"
                      sx={{ my: 0.5 }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          )
        })}
      </Grid>

      <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Market interpretation between {baseMarket} and {comparisonMarket} is based on multiple statistical indicators 
          and should be considered alongside local market conditions and temporal factors.
        </Typography>
      </Alert>
    </Box>
  );
};

InterpretationSection.propTypes = {
  data: PropTypes.shape({
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    stationarity_results: PropTypes.shape({
      adf_test: PropTypes.shape({
        p_value: PropTypes.number,
      })
    }),
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      conflict_correlation: PropTypes.number,
    })
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired
};

export default React.memo(InterpretationSection);