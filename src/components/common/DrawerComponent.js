// src/components/common/DrawerComponent.js

import React from 'react';
import PropTypes from 'prop-types';
import { Drawer } from '@mui/material';

const DrawerComponent = ({ open, onClose, children }) => (
  <Drawer
    anchor="left"
    open={open}
    onClose={onClose}
    ModalProps={{
      keepMounted: true, // Better open performance on mobile.
      // Remove or adjust aria-hidden as needed
    }}
    // Ensure that the drawer content doesn't have aria-hidden when open
  >
    {children}
  </Drawer>
);

DrawerComponent.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default DrawerComponent;
