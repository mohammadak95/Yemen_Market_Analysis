// src/components/common/Navigation.js

import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { 
  Drawer, Box, Toolbar, Divider, Button, Stack,
  useTheme, useMediaQuery, FormControl, InputLabel,
  Select, MenuItem, Checkbox, ListItemText, Typography,
  List, ListItemIcon, ListItem, ListItemButton,
  FormHelperText,
  alpha,
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

const drawerWidth = 240;

const NavigationItem = ({ onClick = () => {}, selected = false, children }) => {
  const theme = useTheme();
  return (
    <ListItem disablePadding>
      <ListItemButton 
        onClick={onClick} 
        selected={selected}
        sx={{
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
          },
        }}
      >
        {children}
      </ListItemButton>
    </ListItem>
  );
};

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

export const CommoditySelector = React.memo(({ 
  commodities = [], 
  selectedCommodity = '', 
  onSelectCommodity 
}) => {
  const dispatch = useDispatch();
  const { data, loading, fetchData } = useDashboardData();
  const lastSelectionRef = useRef(selectedCommodity);
  const theme = useTheme();

  const handleCommoditySelect = useCallback(async (event) => {
    const newCommodity = event.target.value;
    
    if (newCommodity === lastSelectionRef.current) return;
    lastSelectionRef.current = newCommodity;

    try {
      dispatch({ 
        type: 'spatial/setSelectedCommodity', 
        payload: newCommodity 
      });
      
      await Promise.all([
        dispatch(fetchAllSpatialData({ 
          commodity: newCommodity,
          date: "2020-10-01"
        })),
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
      <InputLabel 
        id="commodity-select-label"
        sx={{
          color: theme.palette.text.primary,
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
        }}
      >
        Select Commodity {loading ? '(Loading...)' : ''}
      </InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        value={selectedCommodity}
        onChange={handleCommoditySelect}
        label={`Select Commodity ${loading ? '(Loading...)' : ''}`}
        sx={{
          '& .MuiSelect-select': {
            color: theme.palette.text.primary,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        {commodities.map(commodity => (
          <MenuItem 
            key={commodity} 
            value={commodity}
            sx={{
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                },
              },
            }}
          >
            {capitalizeWords(commodity)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

CommoditySelector.displayName = 'CommoditySelector';

const RegimeSelector = ({ regimes, selectedRegimes, onSelectRegimes }) => {
  const theme = useTheme();
  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
        backgroundColor: theme.palette.background.paper,
      },
    },
  };

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel 
        id="regime-select-label"
        sx={{
          color: theme.palette.text.primary,
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
        }}
      >
        Select Regimes
      </InputLabel>
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
        sx={{
          '& .MuiSelect-select': {
            color: theme.palette.text.primary,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        {regimes.map((regime) => (
          <MenuItem 
            key={regime} 
            value={regime}
            sx={{
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                },
              },
            }}
          >
            <Checkbox 
              checked={selectedRegimes.indexOf(regime) > -1}
              sx={{
                color: theme.palette.text.secondary,
                '&.Mui-checked': {
                  color: theme.palette.primary.main,
                },
              }}
            />
            <ListItemText 
              primary={capitalizeWords(regime)}
              sx={{
                '& .MuiTypography-root': {
                  color: theme.palette.text.primary,
                },
              }}
            />
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
        await dispatch(fetchAllSpatialData({ 
          commodity: newCommodity, 
          date: "2020-10-01" 
        }));
        
        setSelectedCommodity(newCommodity);
        
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

  const buttonSx = {
    color: theme.palette.text.primary,
    borderColor: theme.palette.divider,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    '&.MuiButton-contained': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
    '&.MuiButton-outlined': {
      borderColor: theme.palette.divider,
      '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
      },
    },
  };

  const sidebarContent = useMemo(
    () => (
      <Box 
        sx={{ 
          p: 2,
          backgroundColor: theme.palette.background.paper,
          height: '100%',
        }}
      >
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
            <Button
              variant={selectedAnalysis === 'spatial' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('spatial')}
              sx={buttonSx}
            >
              Spatial Analysis
            </Button>
            <Button
              variant={selectedAnalysis === 'ecm' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('ecm')}
              sx={buttonSx}
            >
              ECM Model
            </Button>
            <Button
              variant={selectedAnalysis === 'priceDiff' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('priceDiff')}
              sx={buttonSx}
            >
              Price Differential Model
            </Button>
            <Button
              variant={selectedAnalysis === 'spatial_model' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('spatial_model')}
              sx={buttonSx}
            >
              Spatial Model
            </Button>
            <Button
              variant={selectedAnalysis === 'tvmii' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
              onClick={() => handleAnalysisChange('tvmii')}
              sx={buttonSx}
            >
              TV-MII Index
            </Button>
          </Stack>

          <Button
            variant="contained"
            sx={{ 
              backgroundColor: theme.palette.error.main,
              color: '#ffffff',
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
              },
            }}
            fullWidth
            onClick={onMethodologyClick}
            startIcon={<InfoIcon />}
          >
            Methodology
          </Button>

          <Button
            variant="contained"
            sx={{ 
              backgroundColor: theme.palette.success.main,
              color: '#ffffff',
              '&:hover': {
                backgroundColor: theme.palette.success.dark,
              },
            }}
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
      theme,
      commodities,
      selectedCommodity,
      regimes,
      selectedRegimes,
      handleRegimesSelect,
      selectedAnalysis,
      handleAnalysisChange,
      onMethodologyClick,
      onOpenWelcomeModal,
      buttonSx,
    ]
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={sidebarOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          [theme.breakpoints.down('sm')]: {
            top: '56px',
            height: 'calc(100% - 56px)',
          },
        },
      }}
    >
      <Toolbar />
      <Divider sx={{ borderColor: theme.palette.divider }} />
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
