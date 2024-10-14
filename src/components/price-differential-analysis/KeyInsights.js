// src/components/price-differential-analysis/KeyInsights.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const KeyInsights = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return null;
  }

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

KeyInsights.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default KeyInsights;
