// src/components/analysis/ecm/InterpretationSection.js

import React from 'react';
import { Box, Typography, Paper, Grid, Chip, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';

const InterpretationSection = ({ selectedData }) => {
  const theme = useTheme();

  if (!selectedData) {
    return (
      <Typography variant="body2" color="text.secondary">
        No interpretation data available.
      </Typography>
    );
  }

  const sections = [
    {
      title: 'Market Adjustment Analysis',
      content: () => {
        const adjustmentSpeed = Math.abs(selectedData.alpha);
        const isEfficient = adjustmentSpeed > 0.2;
        return {
          summary: isEfficient
            ? `Markets adjust ${(adjustmentSpeed * 100).toFixed(1)}% of price gaps per period`
            : 'Markets show slow adjustment to shocks',
          details: [
            `Adjustment Speed: ${adjustmentSpeed > 0.5 ? 'Fast' : adjustmentSpeed > 0.2 ? 'Moderate' : 'Slow'}`,
            `Half-life: ${(Math.log(2) / adjustmentSpeed).toFixed(1)} periods`,
            `Convergence: ${selectedData.alpha < 0 ? 'Present' : 'Absent'}`
          ],
          interpretation: isEfficient
            ? 'Markets efficiently correct price discrepancies'
            : 'Significant market frictions may exist',
          status: isEfficient ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Long-run Integration',
      content: () => {
        const betaDiff = Math.abs(selectedData.beta - 1);
        const isIntegrated = betaDiff < 0.2;
        return {
          summary: isIntegrated
            ? 'Markets show strong long-run integration'
            : 'Limited long-run price relationship',
          details: [
            `Integration Level: ${betaDiff < 0.1 ? 'Perfect' : betaDiff < 0.2 ? 'Strong' : 'Weak'}`,
            `Price Transmission: ${((1 - betaDiff) * 100).toFixed(1)}%`,
            `Market Efficiency: ${isIntegrated ? 'High' : 'Low'}`
          ],
          interpretation: isIntegrated
            ? 'Prices move together in the long run'
            : 'Markets may be segmented',
          status: isIntegrated ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Short-run Dynamics',
      content: () => {
        const immediateResponse = Math.abs(selectedData.gamma);
        const isResponsive = immediateResponse > 0.2;
        return {
          summary: isResponsive
            ? `${(immediateResponse * 100).toFixed(1)}% immediate price transmission`
            : 'Weak immediate price response',
          details: [
            `Response Speed: ${immediateResponse > 0.5 ? 'Rapid' : immediateResponse > 0.2 ? 'Moderate' : 'Slow'}`,
            `Impact: ${(immediateResponse * 100).toFixed(1)}% transmission`,
            `Market Friction: ${isResponsive ? 'Low' : 'High'}`
          ],
          interpretation: isResponsive
            ? 'Markets quickly respond to price changes'
            : 'Significant short-term barriers exist',
          status: isResponsive ? 'success' : 'warning'
        };
      }
    },
    {
      title: 'Model Validation',
      content: () => {
        const dw = selectedData.diagnostics?.Variable_1?.durbin_watson_stat || 0;
        const jb = selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue || 0;
        const isValid = Math.abs(dw - 2) < 0.5 && jb > 0.05;
        return {
          summary: isValid
            ? 'Model assumptions are satisfied'
            : 'Some model assumptions violated',
          details: [
            `Residuals: ${Math.abs(dw - 2) < 0.5 ? 'Independent' : 'Correlated'}`,
            `Distribution: ${jb > 0.05 ? 'Normal' : 'Non-normal'}`,
            `Reliability: ${isValid ? 'High' : 'Moderate'}`
          ],
          interpretation: isValid
            ? 'Results are statistically reliable'
            : 'Interpret results with caution',
          status: isValid ? 'success' : 'warning'
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
          Economic Implications
        </Typography>
        <Typography variant="body2">
          The Error Correction Model reveals the complex dynamics of price adjustment and market integration in Yemen's commodity markets.
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
          Results suggest {Math.abs(selectedData.alpha) > 0.2 ? 'efficient' : 'inefficient'} price adjustment mechanisms, 
          {Math.abs(selectedData.beta - 1) < 0.2 ? ' strong' : ' weak'} market integration, and 
          {Math.abs(selectedData.gamma) > 0.2 ? ' responsive' : ' sluggish'} short-term dynamics.
        </Typography>
      </Box>
    </Box>
  );
};

InterpretationSection.propTypes = {
  selectedData: PropTypes.shape({
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
    diagnostics: PropTypes.shape({
      Variable_1: PropTypes.shape({
        durbin_watson_stat: PropTypes.number,
        jarque_bera_pvalue: PropTypes.number
      })
    })
  }).isRequired,
};

export default React.memo(InterpretationSection);
