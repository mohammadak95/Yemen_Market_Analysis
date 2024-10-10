// src/components/ecm-analysis/ECMKeyInsights.js

import React from 'react';
import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PropTypes from 'prop-types';

const ECMKeyInsights = ({ analysisResult }) => {
  // Extract Granger Causality Tests
  const grangerTests = analysisResult.granger_causality;
  let isGrangerSignificant = false;

  // Iterate over granger causality tests to find significant p-values
  for (const [test] of Object.entries(grangerTests)) {
    if (test.ssr_ftest_pvalue < 0.05) {
      isGrangerSignificant = true;
      break;
    }
  }

  const insights = [
    {
      icon: analysisResult.alpha < 0 ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />,
      text: `The model adjusts ${Math.abs(analysisResult.alpha).toFixed(2)} units per period to return to equilibrium after a shock.`,
      tooltip: 'Alpha represents the speed of adjustment to long-term equilibrium.',
    },
    {
      icon: analysisResult.beta === 1 ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />,
      text: `There is a strong long-term relationship between USD Price and the factors influencing it.`,
      tooltip: 'Beta indicates the strength of the long-term equilibrium relationship.',
    },
    {
      icon: analysisResult.gamma > 0 ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />,
      text: `Short-term dynamics show that USD Price responds positively to changes in influencing factors.`,
      tooltip: 'Gamma captures the short-term impact of independent variables on the dependent variable.',
    },
    {
      icon: isGrangerSignificant
        ? <CheckCircleIcon color="success" />
        : <CancelIcon color="error" />,
      text: `Granger causality is significant, indicating predictive power.`,
      tooltip: 'Granger causality tests whether past values of an independent variable can predict USD Price.',
    },
  ];

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Key Insights
      </Typography>
      <List>
        {insights.map((insight, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <Tooltip title={insight.tooltip} arrow>
                {insight.icon}
              </Tooltip>
            </ListItemIcon>
            <ListItemText primary={insight.text} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

ECMKeyInsights.propTypes = {
  analysisResult: PropTypes.shape({
    alpha: PropTypes.number.isRequired,
    beta: PropTypes.number.isRequired,
    gamma: PropTypes.number.isRequired,
    granger_causality: PropTypes.object.isRequired,
  }).isRequired,
};

export default ECMKeyInsights;