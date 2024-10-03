// src/components/common/ErrorMessage.jsx
import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

const ErrorMessage = ({ message }) => (
  <Box m={2}>
    <Alert severity="error">{message}</Alert>
  </Box>
);

export default ErrorMessage;
