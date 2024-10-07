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
  Button,
  Typography,
  IconButton,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MapIcon from '@mui/icons-material/Map';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { styled } from '@mui/material/styles';
import { drawerWidth, collapsedDrawerWidth } from '../../constants/layout';

// Styled Toggle Button without theme since it's not used
const ToggleButton = styled(IconButton)({
  marginLeft: 'auto',
});

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
  onMethodologyClick,
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
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            {sidebarOpen ? 'Menu' : 'M'}
          </Typography>
          {isSmUp && (
            <ToggleButton onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </ToggleButton>
          )}
        </Toolbar>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* Commodity Selector */}
          {sidebarOpen && (
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
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
          )}

          {/* Regime Selector */}
          {sidebarOpen && (
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
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
  onMethodologyClick: PropTypes.func.isRequired,
};

export default Sidebar;
