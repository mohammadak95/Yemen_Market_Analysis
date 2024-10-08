//src/components/common/Sidebar.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MapIcon from '@mui/icons-material/Map';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import { drawerWidth, collapsedDrawerWidth } from '../../utils/layout';  // Define these widths
import CommoditySelector from './CommoditySelector'; 
import RegimeSelector from './RegimeSelector';

const Sidebar = ({
  commodities = [],
  regimes = [],
  selectedCommodity = '',
  setSelectedCommodity,
  selectedRegime = '',
  setSelectedRegime,
  selectedAnalysis = '',
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  isSmUp,
  onMethodologyClick, // Add methodology button click handler
}) => {
  const theme = useTheme();

  const handleAnalysisChange = (analysis) => {
    setSelectedAnalysis(analysis);
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      <Drawer
        variant={isSmUp ? 'permanent' : 'temporary'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? drawerWidth : collapsedDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? drawerWidth : collapsedDrawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar>
          <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* Commodity Selector */}
          {sidebarOpen && (
            <CommoditySelector
              commodities={commodities}
              selectedCommodity={selectedCommodity}
              onSelectCommodity={setSelectedCommodity}
            />
          )}

          {/* Regime Selector */}
          {sidebarOpen && (
            <RegimeSelector
              regimes={regimes}
              selectedRegime={selectedRegime}
              onSelectRegime={setSelectedRegime}
            />
          )}

          {/* Analysis Selector List */}
          {sidebarOpen && (
            <>
              <Divider sx={{ my: 2 }} />
              <List component="nav" aria-label="analysis options">
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
          )}

          {/* Methodology Button */}
          {sidebarOpen && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
              onClick={onMethodologyClick}
            >
              Methodology
            </Button>
          )}
        </Box>
      </Drawer>
    </>
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
  onMethodologyClick: PropTypes.func.isRequired, // Ensure the Methodology button handler is marked as required
};

export default Sidebar;``