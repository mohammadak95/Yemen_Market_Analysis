// src/components/common/Navigation.js

import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { 
  Drawer, Box, Toolbar, Divider, Button, Stack,
  useTheme, useMediaQuery, FormControl, InputLabel,
  Select, MenuItem, Checkbox, ListItemText, Typography,
  List, ListItemIcon, ListItem, ListItemButton,
  FormHelperText
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import _ from 'lodash';
import { fetchSpatialData, selectSpatialData } from '../../slices/spatialSlice';
import { useDashboardData } from '../../hooks/useDashboardData';
import { fetchAllSpatialData } from '../../slices/spatialSlice';

const capitalizeWords = (str) => {
  return str
    .split(/[_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Constant for drawer width
const drawerWidth = 240;

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

const useLoadingState = () => useSelector(
  state => state.spatial?.status?.dataFetching ?? false,
  _.isEqual
);

const useUniqueMonths = () => useSelector(
  state => state.spatial?.data?.uniqueMonths ?? [],
  _.isEqual
);

const useSpatialDataMemo = () => useSelector(
  state => {
    const data = state.spatial?.data || {};
    return {
      geoData: data.geometry || {},
      flows: data.flowMaps || [],
      analysis: data.spatialAnalysis || {},
      uniqueMonths: data.uniqueMonths || []
    };
  },
  _.isEqual
);

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
export const CommoditySelector = React.memo(({ 
  commodities = [], 
  selectedCommodity = '', 
  onSelectCommodity 
}) => {
  const dispatch = useDispatch();
  const { data, loading, fetchData } = useDashboardData();
  const lastSelectionRef = useRef(selectedCommodity);

  // Handle commodity selection
  const handleCommoditySelect = useCallback(async (event) => {
    const newCommodity = event.target.value;
    
    if (newCommodity === lastSelectionRef.current) return;
    lastSelectionRef.current = newCommodity;

    try {
      // Update commodity in spatial slice
      dispatch({ 
        type: 'spatial/setSelectedCommodity', 
        payload: newCommodity 
      });
      
      // Fetch all necessary data
      await Promise.all([
        // Fetch spatial data
        dispatch(fetchAllSpatialData({ 
          commodity: newCommodity,
          date: "2020-10-01"
        })),
        
        // Notify parent component
        onSelectCommodity(newCommodity)
      ]);
    } catch (error) {
      console.error('Error selecting commodity:', error);
    }
  }, [dispatch, fetchData, onSelectCommodity]);

  return (
    <FormControl 
      fullWidth 
      variant="outlined" 
      size="small" 
      margin="normal"
      disabled={loading}
    >
      <InputLabel id="commodity-select-label">
        Select Commodity {loading ? '(Loading...)' : ''}
      </InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        value={selectedCommodity}
        onChange={handleCommoditySelect}
        label={`Select Commodity ${loading ? '(Loading...)' : ''}`}
      >
        {commodities.map(commodity => (
          <MenuItem 
            key={commodity} 
            value={commodity}
          >
            {capitalizeWords(commodity)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

CommoditySelector.displayName = 'CommoditySelector';

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
  selectedAnalysis = 'spatial',
  setSelectedAnalysis,
  sidebarOpen,
  setSidebarOpen,
  onMethodologyClick,
  selectedRegimes,
  setSelectedRegimes,
  onOpenWelcomeModal,
  handleDrawerToggle,
}) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  const { geoData, flows, analysis, uniqueMonths } = useSelector(selectSpatialData);

  const handleCommodityChange = useCallback(async (newCommodity) => {
    if (newCommodity && newCommodity !== selectedCommodity) {
      try {
        // Update commodity in Redux store
        await dispatch(fetchAllSpatialData({ 
          commodity: newCommodity, 
          date: "2020-10-01" 
        }));
        
        // Update parent component
        setSelectedCommodity(newCommodity);
        
        // Close sidebar on mobile
        if (!isSmUp) {
          setSidebarOpen(false);
        }
      } catch (error) {
        console.error('Error changing commodity:', error);
      }
    }
  }, [dispatch, selectedCommodity, isSmUp, setSelectedCommodity, setSidebarOpen]);

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
            onSelectCommodity={handleCommodityChange}
          />

          <RegimeSelector
            regimes={regimes}
            selectedRegimes={selectedRegimes}
            onSelectRegimes={handleRegimesSelect}
          />

          <Stack spacing={2}>
            {/* Reordered buttons to match Dashboard order */}
            <Button
              variant={selectedAnalysis === 'spatial' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('spatial')}
            >
              Spatial Analysis
            </Button>
            <Button
              variant={selectedAnalysis === 'ecm' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('ecm')}
            >
              ECM Model
            </Button>
            <Button
              variant={selectedAnalysis === 'priceDiff' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('priceDiff')}
            >
              Price Differential Model
            </Button>
            <Button
              variant={selectedAnalysis === 'tvmii' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('tvmii')}
            >
              TV-MII Index
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
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedRegimes: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
};
