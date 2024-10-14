import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const ECMKeyInsights = ({ selectedData }) => {
  const generateKeyInsights = () => {
    const insights = [];

    if (selectedData) {
      const { alpha, beta, gamma } = selectedData;

      if (alpha != null) {
        const adjustmentSpeed = Math.abs(alpha);
        insights.push(
          `The Error Correction Term (α) is ${alpha.toFixed(4)}, indicating ${
            alpha < 0 ? 'convergence' : 'divergence'
          } to long-run equilibrium. The speed of adjustment is ${(adjustmentSpeed * 100).toFixed(2)}% per period.`
        );
      }

      if (beta != null) {
        insights.push(
          `The long-run relationship coefficient (β) is ${beta.toFixed(4)}, suggesting a ${
            beta > 0 ? 'positive' : 'negative'
          } long-term relationship between USD Price and Conflict Intensity.`
        );
      }

      if (gamma != null) {
        insights.push(
          `The short-term dynamics coefficient (γ) is ${gamma.toFixed(4)}, representing the immediate impact of changes in Conflict Intensity on USD Price.`
        );
      }

      if (selectedData.granger_causality && selectedData.granger_causality.conflict_intensity) {
        const significantLags = Object.entries(selectedData.granger_causality.conflict_intensity)
          .filter(([, data]) => data.ssr_ftest_pvalue < 0.05)
          .map(([lag]) => lag);
        
        if (significantLags.length > 0) {
          insights.push(
            `Granger causality is significant at lag${significantLags.length > 1 ? 's' : ''} ${significantLags.join(', ')}, indicating that past values of Conflict Intensity may help predict future USD Prices.`
          );
        } else {
          insights.push(
            "There is no evidence of Granger causality, suggesting that past Conflict Intensity values do not significantly predict future USD Prices."
          );
        }
      }
    }

    return insights;
  };

  const insights = generateKeyInsights();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Key Insights</Typography>
      <List>
        {insights.map((insight, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary={insight} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

ECMKeyInsights.propTypes = {
  selectedData: PropTypes.shape({
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
    granger_causality: PropTypes.shape({
      conflict_intensity: PropTypes.object,
    }),
  }).isRequired,
};

export default ECMKeyInsights;