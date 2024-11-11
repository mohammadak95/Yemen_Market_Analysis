// src/components/common/Navigation.js

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  List,
  ListItemIcon,
  ListItem,
  ListItemButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import { 
  fetchSpatialData, 
  selectSpatialViewData as selectSpatialData // Alias for backward compatibility
} from '../../slices/spatialSlice';

// Utility function to capitalize words
const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Constant for drawer width
const drawerWidth = 240;

/**
 * NavigationItem Component
 *
 * A reusable navigation item that wraps Material-UI's ListItem and ListItemButton.
 *
 * Props:
 * - onClick: Function to handle click events. Defaults to an empty function.
 * - selected: Boolean indicating if the item is selected. Defaults to false.
 * - children: The content to display inside the navigation item (typically ListItemIcon and ListItemText).
 */
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

/**
 * CommoditySelector Component
 *
 * A selector for choosing a single commodity from a list.
 *
 * Props:
 * - commodities: Array of commodity strings.
 * - selectedCommodity: Currently selected commodity.
 * - onSelectCommodity: Function to handle commodity selection.
 */

const CommoditySelector = ({ commodities, selectedCommodity, onSelectCommodity }) => {
  const dispatch = useDispatch();
  const { uniqueMonths } = useSelector(selectSpatialData);
  

  const handleCommoditySelect = useCallback(
    (commodity) => {
      if (commodity) {
        const lowercaseCommodity = commodity.toLowerCase(); // Convert to lowercase
        
        // Dispatch without selectedDate if uniqueMonths is empty
        const payload = {
          selectedCommodity: lowercaseCommodity,
        };
        if (uniqueMonths?.length) {
          payload.selectedDate = uniqueMonths[0];
        }

        dispatch(fetchSpatialData(payload));
        onSelectCommodity(lowercaseCommodity); // Pass lowercase commodity to the callback
      }
    },
    [dispatch, uniqueMonths, onSelectCommodity]
  );

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="commodity-select-label">Select Commodity</InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        name="commodity"
        value={selectedCommodity}
        onChange={(e) => handleCommoditySelect(e.target.value)}
        label="Select Commodity"
        aria-label="Select commodity"
      >
        <MenuItem value="">
          <em>Select a commodity</em>
        </MenuItem>
        {commodities.map((commodity) => (
          <MenuItem key={commodity} value={commodity}>
            {capitalizeWords(commodity)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

CommoditySelector.propTypes = {
  commodities: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  onSelectCommodity: PropTypes.func.isRequired,
};

/**
 * RegimeSelector Component
 *
 * A multi-select component for choosing regimes.
 *
 * Props:
 * - regimes: Array of regime strings.
 * - selectedRegimes: Currently selected regimes.
 * - onSelectRegimes: Function to handle regimes selection.
 */
const RegimeSelector = ({ regimes, selectedRegimes, onSelectRegimes }) => {
  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="regime-select-label">Select Regimes</InputLabel>
      <Select
        labelId="regime-select-label"
        id="regime-select"
        name="regimes"
        multiple
        value={selectedRegimes}
        onChange={(e) => onSelectRegimes(e.target.value)}
        label="Select Regimes"
        aria-label="Select regimes"
        renderValue={(selected) => selected.map((regime) => capitalizeWords(regime)).join(', ')}
        MenuProps={MenuProps}
      >
        {regimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            <Checkbox id={`regime-checkbox-${regime}`} checked={selectedRegimes.indexOf(regime) > -1} />
            <ListItemText primary={capitalizeWords(regime)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

RegimeSelector.propTypes = {
  regimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectRegimes: PropTypes.func.isRequired,
};

/**
 * DiscoveryMenu Component
 *
 * A menu item for discovery-related actions.
 *
 * Props:
 * - onTutorialsClick: Function to handle tutorials click event.
 */
export const DiscoveryMenu = ({ onTutorialsClick }) => {
  return (
    <List>
      <NavigationItem onClick={onTutorialsClick}>
        <ListItemIcon>
          <SchoolIcon />
        </ListItemIcon>
        <ListItemText primary="Tutorials" />
      </NavigationItem>
      <Divider />
      {/* Other menu items can be added here using <NavigationItem> */}
    </List>
  );
};

DiscoveryMenu.propTypes = {
  onTutorialsClick: PropTypes.func.isRequired,
};

/**
 * Sidebar Component
 *
 * The main navigation sidebar component.
 *
 * Props:
 * - commodities: Array of commodity strings.
 * - regimes: Array of regime strings.
 * - selectedCommodity: Currently selected commodity.
 * - setSelectedCommodity: Function to update selected commodity.
 * - selectedAnalysis: Currently selected analysis type.
 * - setSelectedAnalysis: Function to update selected analysis.
 * - sidebarOpen: Boolean indicating if the sidebar is open.
 * - setSidebarOpen: Function to update sidebar open state.
 * - onMethodologyClick: Function to handle methodology button click.
 * - onTutorialsClick: Function to handle tutorials button click.
 * - selectedRegimes: Array of currently selected regimes.
 * - setSelectedRegimes: Function to update selected regimes.
 * - onOpenWelcomeModal: Function to open the welcome modal.
 * - handleDrawerToggle: Function to toggle the drawer state.
 */
export const Sidebar = ({
  commodities = [],
  regimes = [],
  selectedCommodity = '',
  setSelectedCommodity,
  selectedAnalysis = '',
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  onMethodologyClick,
  onTutorialsClick,
  selectedRegimes,
  setSelectedRegimes,
  onOpenWelcomeModal,
  handleDrawerToggle,
}) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  const { uniqueMonths } = useSelector(selectSpatialData);

  const handleAnalysisChange = useCallback(
    (analysisType) => {
      setSelectedAnalysis(analysisType);
      if (!isSmUp) {
        setSidebarOpen(false);
      }

      // If spatial analysis is selected, fetch data if we have a commodity
      if (analysisType === 'spatial' && selectedCommodity) {
        dispatch(
          fetchSpatialData({
            selectedCommodity,
            selectedDate: uniqueMonths[0],
          })
        );
      }
    },
    [setSelectedAnalysis, isSmUp, setSidebarOpen, dispatch, selectedCommodity, uniqueMonths]
  );

  const handleRegimesSelect = useCallback(
    (regimesSelected) => {
      setSelectedRegimes(regimesSelected);
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
            onSelectCommodity={setSelectedCommodity} // Ensure this receives the lowercase value
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
      setSelectedCommodity,
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
  onMethodologyClick: PropTypes.func.isRequired,
  onTutorialsClick: PropTypes.func.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedRegimes: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
};

export default Sidebar;