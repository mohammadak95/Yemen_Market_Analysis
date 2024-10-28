// src/components/common/DiscoveryMenu.js

import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import NavigationItem from './NavigationItem'; // Adjust the path as necessary

const DiscoveryMenu = ({ onTutorialsClick }) => {
  return (
    <List>
      <NavigationItem onClick={onTutorialsClick}>
        <ListItemIcon>
          <SchoolIcon />
        </ListItemIcon>
        <ListItemText primary="Tutorials" />
      </NavigationItem>
      <Divider />
      {/* Other menu items can be added here using <NavigationItem> */}
    </List>
  );
};

DiscoveryMenu.propTypes = {
  onTutorialsClick: PropTypes.func.isRequired,
};

export default DiscoveryMenu;
