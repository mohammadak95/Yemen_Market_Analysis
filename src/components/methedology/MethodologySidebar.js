import React from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Divider,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import methodologyContent from '../../utils/methodologyContent';

const drawerWidth = 240;

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
      <React.Fragment key={`${section.id || section.title}-${index}`}>
        <ListItemButton
          onClick={() => handleListItemClick(`section-${section.id || index}`)}
          sx={{ pl: theme.spacing(level + 2) }}
        >
          <ListItemText primary={section.title} />
        </ListItemButton>
        {section.children && renderListItems(section.children, level + 1)}
      </React.Fragment>
    ));

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="h6" sx={{ ml: 2 }}>
          Contents
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List>{renderListItems(methodologyContent)}</List>
    </Drawer>
  );
};

MethodologySidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MethodologySidebar;