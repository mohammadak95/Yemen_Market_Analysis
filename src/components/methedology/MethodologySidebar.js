// src/components/methodology/MethodologySidebar.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
} from '@mui/material';
import methodologyContent from '../../methodologyData';

const MethodologySidebar = ({ open, onClose }) => {
  const theme = useTheme();

  const handleListItemClick = (anchorId) => {
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    onClose();
  };

  const renderListItems = (sections, level = 0) =>
    sections.map((section, index) => (
      <ListItem
        button
        key={`${section.id}-${index}`}
        onClick={() => handleListItemClick(`section-${section.id}`)}
        sx={{ pl: theme.spacing(level + 1) }}
      >
        <ListItemText primary={section.title} />
        {section.children && renderListItems(section.children, level + 1)}
      </ListItem>
    ));

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: 250,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 250,
          boxSizing: 'border-box',
        },
      }}
    >
      <List>
        {renderListItems(methodologyContent)}
      </List>
    </Drawer>
  );
};

MethodologySidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MethodologySidebar;