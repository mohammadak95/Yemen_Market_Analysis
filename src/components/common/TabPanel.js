// src/components/common/TabPanel.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`ecm-tabpanel-${index}`}
    aria-labelledby={`ecm-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 3 }}>
        <Typography component="div">{children}</Typography>
      </Box>
    )}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node, // No change needed here
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default TabPanel;