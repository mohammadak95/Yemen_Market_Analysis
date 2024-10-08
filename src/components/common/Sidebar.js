// src/components/common/Sidebar.js

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
  Typography,
  Stack,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MapIcon from '@mui/icons-material/Map';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { styled } from '@mui/material/styles';
import { drawerWidth } from '../../styles/LayoutStyles';
import CommoditySelector from './CommoditySelector';
import RegimeSelector from './RegimeSelector';

// Styled Toggle Button for collapsing and expanding the sidebar
const ToggleButton = styled(IconButton)(( ) => ({
  marginLeft: 'auto',
}));

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
  selectedRegime = '',
  setSelectedRegime,
  selectedAnalysis = '',
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  isSmUp,
  onMethodologyClick,
}) => {
  // Removed 'theme' since it's not directly used to prevent ESLint warnings

  const handleAnalysisChange = (analysis) => {
    setSelectedAnalysis(analysis);
    if (!isSmUp) {
      setSidebarOpen(false);
    }
  };

  return (
    <SidebarDrawer
      variant={isSmUp ? 'persistent' : 'temporary'}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      anchor="left"
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
        {sidebarOpen && (
          <Stack spacing={2}>
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
          </Stack>
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
    </SidebarDrawer>
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