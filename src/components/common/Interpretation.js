// src/components/common/Interpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper } from '@mui/material';

const Interpretation = ({ title, messages }) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    {title && (
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
    )}
    {messages.map((msg, index) => (
      <Typography key={index} variant="body1" paragraph>
        {msg}
      </Typography>
    ))}
  </Paper>
);

Interpretation.propTypes = {
  title: PropTypes.string,
  messages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default Interpretation;