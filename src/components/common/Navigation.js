// src/components/common/Navigation.js

import React, { useCallback, useEffect } from 'react';
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
  List,
  ListItemIcon,
  ListItem,
  ListItemButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import {
  setSelectedCommodity,
  setSelectedAnalysis,
  setSelectedRegimes,
  loadSpatialData,
} from '../../slices/spatialSlice';
import {
  selectRegimes,
  selectSelectedRegimes,
  selectCommodities,
  selectSelectedCommodity,
  selectSelectedAnalysis,
} from '../../selectors/spatialSelectors';

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
 */
// src/components/common/Navigation.js

const CommoditySelector = ({ commodities, selectedCommodity }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.spatial.status.loading);

  // Set first commodity as default if none is selected
  useEffect(() => {
    if (!selectedCommodity && commodities.length > 0) {
      dispatch(setSelectedCommodity(commodities[0]));
    }
  }, [selectedCommodity, commodities, dispatch]);

  const handleCommoditySelect = useCallback(
    async (commodity) => {
      if (commodity && !loading) {
        dispatch(setSelectedCommodity(commodity));
        try {
          await dispatch(
            loadSpatialData({
              selectedCommodity: commodity,
              selectedDate: null,
            })
          ).unwrap();
        } catch (error) {
          console.error('Error selecting commodity:', error);
        }
      }
    },
    [dispatch, loading]
  );

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="commodity-select-label">Select Commodity</InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        name="commodity"
        value={selectedCommodity || ''}
        onChange={(e) => handleCommoditySelect(e.target.value)}
        label="Select Commodity"
        aria-label="Select commodity"
        disabled={loading}
      >
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
  // No props are passed since it uses selectors internally
};

/**
 * RegimeSelector Component
 *
 * A multi-select component for choosing regimes.
 */
const RegimeSelector = () => {
  const dispatch = useDispatch();
  const regimes = useSelector(selectRegimes);
  const selectedRegimes = useSelector(selectSelectedRegimes);

  const handleRegimesSelect = useCallback(
    (regimesSelected) => {
      dispatch(setSelectedRegimes(regimesSelected));
    },
    [dispatch]
  );

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="regime-select-label">Select Regimes</InputLabel>
      <Select
        labelId="regime-select-label"
        id="regime-select"
        name="regimes"
        multiple
        value={selectedRegimes}
        onChange={(e) => handleRegimesSelect(e.target.value)}
        label="Select Regimes"
        aria-label="Select regimes"
        renderValue={(selected) =>
          selected.map((regime) => capitalizeWords(regime)).join(', ')
        }
      >
        {regimes.map((regime) => (
          <MenuItem key={regime} value={regime}>
            <Checkbox checked={selectedRegimes.indexOf(regime) > -1} />
            <ListItemText primary={capitalizeWords(regime)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

RegimeSelector.propTypes = {
  // No props are passed since it uses selectors internally
};

/**
 * DiscoveryMenu Component
 *
 * A menu item for discovery-related actions.
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
 */
export const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  onMethodologyClick,
  onTutorialsClick,
  onOpenWelcomeModal,
  handleDrawerToggle,
}) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();

  const selectedAnalysis = useSelector(selectSelectedAnalysis);

  const handleAnalysisChange = useCallback(
    (analysisType) => {
      dispatch(setSelectedAnalysis(analysisType));
      if (!isSmUp) {
        setSidebarOpen(false);
      }
    },
    [dispatch, isSmUp, setSidebarOpen]
  );

  const sidebarContent = (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <CommoditySelector />

        <RegimeSelector />

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
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  onTutorialsClick: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
};

/**
 * Navigation Component
 *
 * The main navigation component that includes the Sidebar.
 *
 * Props:
 * All props required by Sidebar.
 */
const Navigation = (props) => {
  return <Sidebar {...props} />;
};

Navigation.propTypes = {
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  onTutorialsClick: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired,
};

export default Navigation;