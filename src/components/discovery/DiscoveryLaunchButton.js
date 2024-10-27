// src/components/discovery/DiscoveryLaunchButton.js

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';

const DiscoveryLaunchButton = ({ onClick }) => {
  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<SchoolIcon />}
      onClick={onClick}
    >
      Launch Discovery
    </Button>
  );
};

DiscoveryLaunchButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default DiscoveryLaunchButton;
