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
        const integrationStrength = data.regression_results?.r_squared || 0;
        return {
          summary: isIntegrated 
            ? 'Markets exhibit significant price co-movement patterns'
            : 'Markets show limited price relationship',
          details: [
            `Integration: ${isIntegrated ? 'Present' : 'Absent'}`,
            `Strength: ${(integrationStrength * 100).toFixed(1)}%`,
            `Confidence: ${((1 - (data.cointegration_results?.p_value || 1)) * 100).toFixed(1)}%`
          ],
          interpretation: isIntegrated
            ? 'Price changes in one market are systematically reflected in the other, suggesting effective arbitrage'
            : 'Markets appear to operate independently, indicating potential trade barriers',
          status: isIntegrated ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Price Stability Analysis',
      content: () => {
        const isStationaryADF = data.stationarity_results?.ADF?.['p-value'] < 0.05;
        const isStationaryKPSS = data.stationarity_results?.KPSS?.['p-value'] >= 0.05;
        const isStable = isStationaryADF && isStationaryKPSS;
        
        return {
          summary: isStable
            ? 'Price differentials show mean-reverting behavior'
            : 'Price differentials exhibit persistent deviations',
          details: [
            `Mean Reversion: ${isStationaryADF ? 'Confirmed' : 'Not Confirmed'}`,
            `Trend Stability: ${isStationaryKPSS ? 'Stable' : 'Unstable'}`,
            `Overall: ${isStable ? 'Stable' : 'Volatile'}`
          ],
          interpretation: isStable
            ? 'Price differences tend to correct over time, indicating effective market mechanisms'
            : 'Price gaps persist, suggesting structural market inefficiencies',
          status: isStable ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Market Friction Analysis',
      content: () => {
        const distance = data.diagnostics?.distance_km || 0;
        const conflict = data.diagnostics?.conflict_correlation || 0;
        const hasSignificantFrictions = distance > 2 || Math.abs(conflict) > 0.3;
        
        return {
          summary: hasSignificantFrictions
            ? 'Significant market frictions detected'
            : 'Limited market frictions observed',
          details: [
            `Distance: ${distance.toFixed(1)} km`,
            `Conflict Impact: ${(conflict * 100).toFixed(1)}%`,
            `Friction Level: ${hasSignificantFrictions ? 'High' : 'Low'}`
          ],
          interpretation: hasSignificantFrictions
            ? 'Physical and conflict-related barriers may impede market efficiency'
            : 'Market conditions support relatively smooth trade flows',
          status: hasSignificantFrictions ? 'warning' : 'success'
        };
      }
    },
    {
      title: 'Policy Implications',
      content: () => {
        const needsIntervention = 
          data.cointegration_results?.p_value >= 0.05 ||
          Math.abs(data.diagnostics?.conflict_correlation || 0) > 0.3;
        
        return {
          summary: needsIntervention
            ? 'Market intervention may be warranted'
            : 'Markets functioning relatively efficiently',
          details: [
            `Integration Support: ${needsIntervention ? 'Needed' : 'Limited Need'}`,
            `Trade Barriers: ${needsIntervention ? 'Address' : 'Monitor'}`,
            `Policy Focus: ${needsIntervention ? 'Intervention' : 'Maintenance'}`
          ],
          interpretation: needsIntervention
            ? 'Consider policies to reduce trade barriers and enhance market integration'
            : 'Focus on maintaining current market conditions and monitoring changes',
          status: needsIntervention ? 'warning' : 'success'
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
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  '&:hover .interpretation-info': {
                    opacity: 1
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2 
                }}>
                  <Typography variant="h6" color="primary">
                    {section.title}
                  </Typography>
                  <Chip
                    icon={interpretation.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                    label={interpretation.status === 'success' ? 'Favorable' : 'Attention Needed'}
                    color={interpretation.status}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body1" paragraph>
                  {interpretation.summary}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
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
                <Typography 
                  className="interpretation-info"
                  variant="body2" 
                  sx={{ 
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: theme.palette.text.secondary
                  }}
                >
                  {interpretation.interpretation}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ 
        mt: 3, 
        p: 2, 
        bgcolor: theme.palette.grey[50], 
        borderRadius: 1,
        '&:hover .methodology-info': {
          opacity: 1
        }
      }}>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          Methodology Note
        </Typography>
        <Typography variant="body2">
          Analysis of market relationship between {baseMarket} and {comparisonMarket} combines multiple 
          statistical indicators with economic theory.
        </Typography>
        <Typography 
          className="methodology-info"
          variant="caption" 
          sx={{ 
            display: 'block',
            mt: 1,
            opacity: 0,
            transition: 'opacity 0.2s',
            color: theme.palette.text.secondary
          }}
        >
          Interpretations should be considered alongside local market conditions, temporal factors, 
          and broader economic context.
        </Typography>
      </Box>
    </Box>
  );
};

InterpretationSection.propTypes = {
  data: PropTypes.shape({
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    regression_results: PropTypes.shape({
      r_squared: PropTypes.number,
    }),
    stationarity_results: PropTypes.shape({
      ADF: PropTypes.shape({
        'p-value': PropTypes.number,
      }),
      KPSS: PropTypes.shape({
        'p-value': PropTypes.number,
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
