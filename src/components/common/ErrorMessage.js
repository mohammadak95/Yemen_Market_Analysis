//src/components/common/ErrorMessage.js

import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@mui/material';

const ErrorMessage = ({ message }) => (
  <Alert severity="error" sx={{ mt: 2 }}>
    {message}
  </Alert>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default ErrorMessage;