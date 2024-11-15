// src/components/common/Navigation.js

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  Button,
  Stack,
  useTheme,
  List,
  ListItemIcon,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import MapIcon from '@mui/icons-material/Map';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { setSelectedAnalysis } from '../../slices/spatialSlice';
import MarketInterface from './MarketInterface';

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

export const DiscoveryMenu = ({ onTutorialsClick }) => (
  <List>
    <NavigationItem onClick={onTutorialsClick}>
      <ListItemIcon>
        <SchoolIcon />
      </ListItemIcon>
      <ListItemText primary="Tutorials" />
    </NavigationItem>
    <Divider />
  </List>
);

DiscoveryMenu.propTypes = {
  onTutorialsClick: PropTypes.func.isRequired,
};



const drawerWidth = 240;

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  handleDrawerToggle,
  onMethodologyClick,
  onTutorialsClick,
  isSmUp,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Get analysis state from Redux
  const selectedAnalysis = useSelector(state => state.spatial.ui.selectedAnalysis);

  const handleAnalysisChange = useCallback((analysisType) => {
    dispatch(setSelectedAnalysis(analysisType));
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  }, [dispatch, isSmUp, setSidebarOpen]);

  const sidebarContent = (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* Market Interface Component */}
        <MarketInterface />
        
        {/* Analysis Buttons */}
        <Stack spacing={2}>
          <Button
            variant={selectedAnalysis === 'ecm' ? 'contained' : 'outlined'}
            color="primary"
            fullWidth
            onClick={() => handleAnalysisChange('ecm')}
            startIcon={<TimelineIcon />}
          >
            ECM Analysis
          </Button>

          <Button
            variant={selectedAnalysis === 'priceDiff' ? 'contained' : 'outlined'}
            color="primary"
            fullWidth
            onClick={() => handleAnalysisChange('priceDiff')}
            startIcon={<CompareArrowsIcon />}
          >
            Price Differential
          </Button>

          <Button
            variant={selectedAnalysis === 'spatial' ? 'contained' : 'outlined'}
            color="primary"
            fullWidth
            onClick={() => handleAnalysisChange('spatial')}
            startIcon={<MapIcon />}
          >
            Spatial Analysis
          </Button>

          <Button
            variant={selectedAnalysis === 'tvmii' ? 'contained' : 'outlined'}
            color="primary"
            fullWidth
            onClick={() => handleAnalysisChange('tvmii')}
            startIcon={<TrendingUpIcon />}
          >
            TV-MII Analysis
          </Button>
        </Stack>

        <Divider />

        {/* Action Buttons */}
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.dark }
          }}
          fullWidth
          onClick={onMethodologyClick}
          startIcon={<InfoIcon />}
        >
          Methodology
        </Button>

        <Button
          variant="contained"
          sx={{ 
            backgroundColor: theme.palette.info.main,
            '&:hover': { backgroundColor: theme.palette.info.dark }
          }}
          fullWidth
          onClick={onTutorialsClick}
          startIcon={<MenuBookIcon />}
        >
          Tutorials
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Drawer
      variant={isSmUp ? 'persistent' : 'temporary'}
      open={sidebarOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          [theme.breakpoints.down('sm')]: {
            top: '56px',
            height: 'calc(100% - 56px)',
          },
        },
      }}
    >
      <Toolbar />
      <Divider />
      {sidebarContent}
    </Drawer>
  );
};

Sidebar.propTypes = {
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  onTutorialsClick: PropTypes.func.isRequired,
  isSmUp: PropTypes.bool.isRequired,
};

export default React.memo(Sidebar);

