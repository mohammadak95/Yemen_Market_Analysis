// src/components/common/NavigationItem.js

import React from 'react';
import PropTypes from 'prop-types';
import { ListItem, ListItemButton } from '@mui/material';

/**
 * NavigationItem Component
 *
 * A reusable navigation item that wraps Material-UI's ListItem and ListItemButton.
 *
 * Props:
 * - onClick: Function to handle click events. Defaults to an empty function.
 * - selected: Boolean indicating if the item is selected. Defaults to false.
 * - children: The content to display inside the navigation item (typically ListItemIcon and ListItemText).
 */
const NavigationItem = ({ onClick = () => {}, selected = false, children }) => (
  <ListItem disablePadding>
    <ListItemButton onClick={onClick} selected={selected}>
      {children}
    </ListItemButton>
  </ListItem>
);

NavigationItem.propTypes = {
  onClick: PropTypes.func,
  selected: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default NavigationItem;
