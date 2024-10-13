// src/components/common/Sidebar.js

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  Button,
  Typography,
  Stack,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { drawerWidth } from '../../styles/LayoutStyles';
import CommoditySelector from './CommoditySelector';
import RegimeSelector from './RegimeSelector';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// Styled Drawer with dynamic width based on 'open' prop
const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
  },
}));

const Sidebar = ({
  commodities = [],
  regimes = [],
  selectedCommodity = '',
  setSelectedCommodity,
  selectedAnalysis = '',
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  isSmUp,
  onMethodologyClick,
  selectedRegimes,
  setSelectedRegimes,
}) => {
  const handleAnalysisChange = useCallback((analysis) => {
    setSelectedAnalysis(analysis);
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  }, [setSelectedAnalysis, isSmUp, setSidebarOpen]);

  const handleDrawerClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleCommoditySelect = useCallback((commodity) => {
    setSelectedCommodity(commodity);
  }, [setSelectedCommodity]);

  const handleRegimesSelect = useCallback((regimes) => {
    setSelectedRegimes(regimes);
  }, [setSelectedRegimes]);

  const sidebarContent = useMemo(() => (
    <Stack spacing={3}>
      {/* Commodity Selector */}
      <CommoditySelector
        commodities={commodities}
        selectedCommodity={selectedCommodity}
        onSelectCommodity={handleCommoditySelect}
      />

      {/* Regime Selector */}
      <RegimeSelector
        regimes={regimes}
        selectedRegimes={selectedRegimes}
        onSelectRegimes={handleRegimesSelect}
      />

      {/* Analysis Buttons */}
      <Stack spacing={2}>
        <Button
          variant={selectedAnalysis === 'ecm' ? 'contained' : 'outlined'}
          color="primary"
          fullWidth
          onClick={() => handleAnalysisChange('ecm')}
        >
          ECM Analysis
        </Button>
        <Button
          variant={selectedAnalysis === 'priceDiff' ? 'contained' : 'outlined'}
          color="primary"
          fullWidth
          onClick={() => handleAnalysisChange('priceDiff')}
        >
          Price Differential Analysis
        </Button>
        <Button
          variant={selectedAnalysis === 'spatial' ? 'contained' : 'outlined'}
          color="primary"
          fullWidth
          onClick={() => handleAnalysisChange('spatial')}
        >
          Spatial Analysis
        </Button>
      </Stack>

      {/* Methodology Button */}
      <Button
        variant="contained"
        color="secondary"
        fullWidth
        onClick={onMethodologyClick}
      >
        Methodology
      </Button>
    </Stack>
  ), [
    commodities,
    selectedCommodity,
    handleCommoditySelect,
    regimes,
    selectedRegimes,
    handleRegimesSelect,
    selectedAnalysis,
    handleAnalysisChange,
    onMethodologyClick
  ]);

  return (
    <SidebarDrawer
      variant={isSmUp ? 'persistent' : 'temporary'}
      open={sidebarOpen}
      onClose={handleDrawerClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      anchor="left"
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" noWrap component="div">
          Menu
        </Typography>
        {/* Toggle Button to Collapse Sidebar */}
        <IconButton onClick={handleDrawerClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ p: 2 }}>
        {sidebarOpen && sidebarContent}
      </Box>
    </SidebarDrawer>
  );
};

Sidebar.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string),
  regimes: PropTypes.arrayOf(PropTypes.string),
  selectedCommodity: PropTypes.string,
  setSelectedCommodity: PropTypes.func.isRequired,
  selectedAnalysis: PropTypes.string,
  setSelectedAnalysis: PropTypes.func.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  isSmUp: PropTypes.bool.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedRegimes: PropTypes.func.isRequired,
};

export default React.memo(Sidebar);