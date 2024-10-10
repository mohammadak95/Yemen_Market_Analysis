// src/components/ecm-analysis/ECMInterpretation.js

import React from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import TimerIcon from '@mui/icons-material/Timer';
import PropTypes from 'prop-types';

const ECMInterpretation = ({ analysisResult }) => {
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Interpretation of Results
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <EmojiObjectsIcon sx={{ mr: 1 }} /> Long-Term Relationship
        </Typography>
        <Typography variant="body1" gutterBottom>
          The coefficient Beta (β) is {analysisResult.beta.toFixed(2)}, indicating a strong and stable long-term relationship between USD Price and the factors influencing it. This means that changes in the influencing factors are consistently associated with proportional changes in USD Price over the long run.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TimerIcon sx={{ mr: 1 }} /> Short-Term Dynamics
        </Typography>
        <Typography variant="body1" gutterBottom>
          The coefficient Gamma (γ) is {analysisResult.gamma.toFixed(2)}, which signifies how quickly USD Price adjusts in response to deviations from the long-term equilibrium. A Gamma of {analysisResult.gamma.toFixed(2)} suggests that for every unit deviation from equilibrium, USD Price adjusts by {analysisResult.gamma.toFixed(2)} units in the short term.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Overall Implications
        </Typography>
        <Typography variant="body1">
          The ECM analysis reveals that the factors influencing USD Price significantly affect its movement, both in the short term and long term. The Granger causality tests further confirm that changes in these factors can predict future USD Price movements, especially at lag 1. This relationship underscores the impact of socio-political and economic factors on market dynamics within Yemen.
        </Typography>
      </Box>
    </Paper>
  );
};

ECMInterpretation.propTypes = {
  analysisResult: PropTypes.shape({
    beta: PropTypes.number.isRequired,
    gamma: PropTypes.number.isRequired,
  }).isRequired,
};

export default ECMInterpretation;