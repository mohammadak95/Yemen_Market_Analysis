// src/components/common/Sidebar.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'; // Removed 'useMediaQuery', 'useTheme' imports
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MapIcon from '@mui/icons-material/Map';

const drawerWidth = 240;

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
}) => {
  const handleCommodityChange = (event) => {
    setSelectedCommodity(event.target.value.trim().toLowerCase());
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  const handleRegimeChange = (event) => {
    setSelectedRegime(event.target.value.trim().toLowerCase());
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  const handleAnalysisChange = (analysis) => {
    setSelectedAnalysis(analysis);
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  const drawerContent = (
    <div>
      <Toolbar />
      <Divider />
      <Box sx={{ p: 2 }}>
        {/* Commodity Selector */}
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel id="commodity-label">Commodity</InputLabel>
          <Select
            labelId="commodity-label"
            value={selectedCommodity}
            onChange={handleCommodityChange}
            label="Commodity"
          >
            <MenuItem value="">
              <em>Select a commodity</em>
            </MenuItem>
            {commodities.map((commodity) => (
              <MenuItem key={commodity} value={commodity.toLowerCase()}>
                {commodity}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Regime Selector */}
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel id="regime-label">Regime</InputLabel>
          <Select
            labelId="regime-label"
            value={selectedRegime}
            onChange={handleRegimeChange}
            label="Regime"
          >
            <MenuItem value="">
              <em>Select a regime</em>
            </MenuItem>
            {regimes.map((regime) => (
              <MenuItem key={regime} value={regime.toLowerCase()}>
                {regime}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Analysis Selector List */}
        <Divider sx={{ my: 2 }} />
        <List>
          <ListItem
            button
            selected={selectedAnalysis === 'ecm'}
            onClick={() => handleAnalysisChange('ecm')}
          >
            <ListItemIcon>
              <AssessmentIcon />
            </ListItemIcon>
            <ListItemText primary="ECM Analysis" />
          </ListItem>
          <ListItem
            button
            selected={selectedAnalysis === 'priceDiff'}
            onClick={() => handleAnalysisChange('priceDiff')}
          >
            <ListItemIcon>
              <ShowChartIcon />
            </ListItemIcon>
            <ListItemText primary="Price Differential Analysis" />
          </ListItem>
          <ListItem
            button
            selected={selectedAnalysis === 'spatial'}
            onClick={() => handleAnalysisChange('spatial')}
          >
            <ListItemIcon>
              <MapIcon />
            </ListItemIcon>
            <ListItemText primary="Spatial Analysis" />
          </ListItem>
        </List>
      </Box>
    </div>
  );

  return (
    <>
      {isSmUp ? (
        <Drawer
          variant="persistent"
          open={sidebarOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
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
};

export default Sidebar;