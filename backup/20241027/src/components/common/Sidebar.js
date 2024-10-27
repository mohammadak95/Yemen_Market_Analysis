import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { drawerWidth } from '../../styles/LayoutStyles';
import CommoditySelector from './CommoditySelector';
import RegimeSelector from './RegimeSelector';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
            <Button
              variant={selectedAnalysis === 'tvmii' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('tvmii')}
            >
              TV-MII Analysis
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

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={sidebarOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          [theme.breakpoints.down('sm')]: {
            top: '56px', // Height of mobile AppBar
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