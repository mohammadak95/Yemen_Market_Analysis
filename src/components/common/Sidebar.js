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
import MenuBookIcon from '@mui/icons-material/MenuBook';

const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    boxSizing: 'border-box',
    width: drawerWidth,
    [theme.breakpoints.down('sm')]: {
      width: '100%',
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
  onTutorialsClick,
  selectedRegimes,
  setSelectedRegimes,
  onOpenWelcomeModal,
  handleDrawerToggle,
}) => {
  const handleAnalysisChange = useCallback(
    (analysis) => {
      setSelectedAnalysis(analysis);
      if (!isSmUp) {
        setSidebarOpen(false);
      }
    },
    [setSelectedAnalysis, isSmUp, setSidebarOpen]
  );

  const handleCommoditySelect = useCallback(
    (commodity) => {
      setSelectedCommodity(commodity);
    },
    [setSelectedCommodity]
  );

  const handleRegimesSelect = useCallback(
    (regimes) => {
      setSelectedRegimes(regimes);
    },
    [setSelectedRegimes]
  );

  const sidebarContent = useMemo(
    () => (
      <Box sx={{ p: 2 }}>
        <Stack spacing={3}>
          <CommoditySelector
            commodities={commodities}
            selectedCommodity={selectedCommodity}
            onSelectCommodity={handleCommoditySelect}
          />

          <RegimeSelector
            regimes={regimes}
            selectedRegimes={selectedRegimes}
            onSelectRegimes={handleRegimesSelect}
          />

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

          <Button
            variant="contained"
            sx={{ backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }}
            fullWidth
            onClick={onMethodologyClick}
            startIcon={<InfoIcon />}
          >
            Methodology
          </Button>

          <Button
            variant="contained"
            sx={{ backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}
            fullWidth
            onClick={onTutorialsClick}
            startIcon={<MenuBookIcon />}
          >
            Tutorials
          </Button>

          <Button
            variant="contained"
            sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}
            fullWidth
            onClick={onOpenWelcomeModal}
            startIcon={<InfoIcon />}
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
      onTutorialsClick,
      onOpenWelcomeModal,
    ]
  );

  const variant = isSmUp ? 'persistent' : 'temporary';

  return (
    <SidebarDrawer
      variant={variant}
      open={sidebarOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      anchor="left"
    >
      <Toolbar />
      <Divider />
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
  onTutorialsClick: PropTypes.func.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedRegimes: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
};

export default React.memo(Sidebar);
