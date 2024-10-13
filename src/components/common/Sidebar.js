// src/components/common/Sidebar.js

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  Button,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { drawerWidth } from '../../styles/LayoutStyles';
import CommoditySelector from './CommoditySelector';
import RegimeSelector from './RegimeSelector';
import InfoIcon from '@mui/icons-material/Info';

const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    height: '100vh', // Ensure full height
    [theme.breakpoints.up('sm')]: {
      position: 'relative',
    },
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
  onOpenWelcomeModal,
}) => {

  // Handle analysis button clicks
  const handleAnalysisChange = useCallback(
    (analysis) => {
      setSelectedAnalysis(analysis);
      if (!isSmUp) {
        setSidebarOpen(false); // Close sidebar on mobile after selection
      }
    },
    [setSelectedAnalysis, isSmUp, setSidebarOpen]
  );

  // Handle commodity selection
  const handleCommoditySelect = useCallback(
    (commodity) => {
      setSelectedCommodity(commodity);
    },
    [setSelectedCommodity]
  );

  // Handle regimes selection
  const handleRegimesSelect = useCallback(
    (regimes) => {
      setSelectedRegimes(regimes);
    },
    [setSelectedRegimes]
  );

  // Memoize sidebar content for performance
  const sidebarContent = useMemo(
    () => (
      <Box sx={{ p: 2 }}>
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
            {/* Tutorials Button */}
            <Button
              variant={selectedAnalysis === 'tutorials' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('tutorials')}
            >
              Tutorials
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

          {/* Welcome Modal Button */}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<InfoIcon />}
            fullWidth
            onClick={onOpenWelcomeModal}
          >
            How to Use
          </Button>
        </Stack>
      </Box>
    ),
    [
      commodities,
      selectedCommodity,
      handleCommoditySelect,
      regimes,
      selectedRegimes,
      handleRegimesSelect,
      selectedAnalysis,
      handleAnalysisChange,
      onMethodologyClick,
      onOpenWelcomeModal,
    ]
  );

  const variant = isSmUp ? 'persistent' : 'temporary';

  return (
    <SidebarDrawer
      variant={variant}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      anchor="left"
    >
      <Toolbar />
      <Divider />
      {/* Sidebar Content */}
      {sidebarContent}
    </SidebarDrawer>
  );
};

Sidebar.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string).isRequired,
  regimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  setSelectedCommodity: PropTypes.func.isRequired,
  selectedAnalysis: PropTypes.string.isRequired,
  setSelectedAnalysis: PropTypes.func.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  isSmUp: PropTypes.bool.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedRegimes: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
};

export default React.memo(Sidebar);