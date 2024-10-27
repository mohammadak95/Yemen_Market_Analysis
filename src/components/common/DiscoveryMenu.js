// src/components/common/DiscoveryMenu.js

import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';

const DiscoveryMenu = ({ onTutorialsClick }) => {
  return (
    <List>
      <ListItem button onClick={onTutorialsClick}>
        <ListItemIcon>
          <SchoolIcon />
        </ListItemIcon>
        <ListItemText primary="Tutorials" />
      </ListItem>
      <Divider />
      {/* Other menu items */}
    </List>
  );
};

DiscoveryMenu.propTypes = {
  onTutorialsClick: PropTypes.func.isRequired,
};

export default DiscoveryMenu;
