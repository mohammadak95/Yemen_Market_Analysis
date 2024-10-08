//src/components/common/Sidebar.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  List,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MapIcon from '@mui/icons-material/Map';
import { styled, useTheme } from '@mui/material/styles';
import CommoditySelector from './CommoditySelector';
import RegimeSelector from './RegimeSelector';

const drawerWidth = 240;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Sidebar = ({
  commodities,
  regimes,
  selectedCommodity,
  setSelectedCommodity,
  selectedRegime,
  setSelectedRegime,
  selectedAnalysis,
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  isSmUp,
}) => {
  const theme = useTheme();

  const handleDrawerClose = () => {
    setSidebarOpen(false);
  };

  const handleAnalysisChange = (analysis) => {
    setSelectedAnalysis(analysis);
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  const drawer = (
    <>
      <DrawerHeader>
        <IconButton onClick={handleDrawerClose}>
          {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <Box sx={{ p: 2 }}>
        <CommoditySelector
          commodities={commodities}
          selectedCommodity={selectedCommodity}
          onSelectCommodity={setSelectedCommodity}
        />
        <RegimeSelector
          regimes={regimes}
          selectedRegime={selectedRegime}
          onSelectRegime={setSelectedRegime}
        />
      </Box>
      <Divider />
      <List>
        <ListItem
          button
          selected={selectedAnalysis === 'ecm'}
          onClick={() => handleAnalysisChange('ecm')}
        >
          <ListItemIcon>
            <AssessmentIcon color={selectedAnalysis === 'ecm' ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="ECM Analysis" />
        </ListItem>
        <ListItem
          button
          selected={selectedAnalysis === 'priceDiff'}
          onClick={() => handleAnalysisChange('priceDiff')}
        >
          <ListItemIcon>
            <ShowChartIcon color={selectedAnalysis === 'priceDiff' ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Price Differential Analysis" />
        </ListItem>
        <ListItem
          button
          selected={selectedAnalysis === 'spatial'}
          onClick={() => handleAnalysisChange('spatial')}
        >
          <ListItemIcon>
            <MapIcon color={selectedAnalysis === 'spatial' ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Spatial Analysis" />
        </ListItem>
      </List>
    </>
  );

  return (
    <Drawer
      variant={isSmUp ? 'permanent' : 'temporary'}
      open={sidebarOpen}
      onClose={handleDrawerClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
};

Sidebar.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string),
  regimes: PropTypes.arrayOf(PropTypes.string),
  selectedCommodity: PropTypes.string,
  setSelectedCommodity: PropTypes.func.isRequired,
  selectedRegime: PropTypes.string,
  setSelectedRegime: PropTypes.func.isRequired,
  selectedAnalysis: PropTypes.string,
  setSelectedAnalysis: PropTypes.func.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  isSmUp: PropTypes.bool.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
};

export default Sidebar;