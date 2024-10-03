import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

const ErrorMessage = ({ message }) => (
  <Box m={2}>
    <Alert severity="error">{message}</Alert>
  </Box>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default ErrorMessage;