// src/components/ecm-analysis/ECMKeyInsights.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const ECMKeyInsights = ({ analysisResult }) => {
  const insights = [
    {
      text: `The ECM model for ${analysisResult.model_name} indicates significant findings in the relationship between USD Price and Conflict Intensity.`,
      condition: analysisResult.model_name,
    },
    {
      text: `The price differential is ${analysisResult.price_differential_description}.`,
      condition: analysisResult.price_differential_description,
    },
    {
      text: `The model suggests ${analysisResult.model_description}.`,
      condition: analysisResult.model_description,
    },
  ].filter(insight => insight.condition);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Key Insights</Typography>
      <List>
        {insights.map((insight, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <InfoIcon color="primary" />
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
    model_name: PropTypes.string,
    price_differential_description: PropTypes.string,
    model_description: PropTypes.string,
  }).isRequired,
};

export default ECMKeyInsights;