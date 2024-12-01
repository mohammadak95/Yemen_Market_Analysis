import React, { useState, useCallback, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  Toolbar,
  IconButton,
  Box,
  useMediaQuery,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import { toggleDarkMode } from './slices/themeSlice';
import Header from './components/common/Header';
import { Sidebar } from './components/common/Navigation';
import Dashboard from './Dashboard';
import { useDashboardData } from './hooks/useDashboardData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorDisplay from './components/common/ErrorDisplay';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { WelcomeModal } from './components/common/WelcomeModal';
import StateExporter from './components/utils/StateExporter';
import { selectHasSeenWelcome, setHasSeenWelcome } from './store/welcomeModalSlice';
import { useWindowSize } from './hooks';
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import { 
  fetchAllSpatialData,
  selectSpatialData,
  selectLoadingStatus,
  selectError,
  selectCommodityInfo
} from './slices/spatialSlice';

const DRAWER_WIDTH = 240;
const DEFAULT_DATE = '2020-10-01';

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['margin-left', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('sm')]: {
    width: `calc(100% - ${open ? DRAWER_WIDTH : 0}px)`,
    marginLeft: open ? `${DRAWER_WIDTH}px` : 0,
  },
}));

const useAppState = () => {
  const dispatch = useDispatch();
  const { data, loading } = useDashboardData();
  const error = useSelector(selectError);
  const hasSeenWelcome = useSelector(selectHasSeenWelcome);
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode ?? false);
  const { commodities } = useSelector(selectCommodityInfo);

  // Theme setup
  const theme = useMemo(() => 
    isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides,
    [isDarkMode]
  );

  return {
    dispatch,
    data,
    loading,
    error,
    hasSeenWelcome,
    isDarkMode,
    commodities,
    theme
  };
};

const App = () => {
  // Initialize hook-based state
  const {
    dispatch,
    data,
    loading,
    error,
    hasSeenWelcome,
    isDarkMode,
    commodities,
    theme
  } = useAppState();

  // Media query hooks
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const windowSize = useWindowSize();

  // Local state initialization
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedDate, setSelectedDate] = useState(DEFAULT_DATE);
  const [selectedAnalysis, setSelectedAnalysis] = useState('spatial');
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);
  const [spatialViewConfig, setSpatialViewConfig] = useState({
    center: [15.3694, 44.191],
    zoom: 6,
  });
  const [modalStates, setModalStates] = useState({
    methodology: false
  });

  // Initial data loading
  useEffect(() => {
    if (!commodities.length && !loading) {
      dispatch(fetchAllSpatialData({ 
        commodity: '', 
        date: DEFAULT_DATE 
      }));
    }
  }, [dispatch, commodities.length, loading]);

  // Default commodity selection
  useEffect(() => {
    if (commodities.length && !selectedCommodity) {
      const defaultCommodity = commodities[0]?.toLowerCase();
      if (defaultCommodity) {
        setSelectedCommodity(defaultCommodity);
        dispatch(fetchAllSpatialData({
          commodity: defaultCommodity,
          date: DEFAULT_DATE
        }));
      }
    }
  }, [commodities, selectedCommodity, dispatch]);

  // Callback handlers
  const handleCommodityChange = useCallback((newCommodity) => {
    if (newCommodity && newCommodity !== selectedCommodity) {
      setSelectedCommodity(newCommodity);
      dispatch(fetchAllSpatialData({
        commodity: newCommodity,
        date: selectedDate || DEFAULT_DATE
      }));
    }
  }, [dispatch, selectedCommodity, selectedDate]);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleModalToggle = useCallback((modalName, isOpen) => {
    if (modalName === 'welcome') return;
    setModalStates(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const handleWelcomeModalClose = useCallback((dontShowAgain) => {
    dispatch(setHasSeenWelcome(dontShowAgain));
  }, [dispatch]);

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Application Error"
        showDetails={process.env.NODE_ENV !== 'production'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EnhancedErrorBoundary>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <StyledAppBar position="fixed" open={sidebarOpen && isSmUp}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="toggle drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ marginRight: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Header
                isDarkMode={isDarkMode}
                toggleDarkMode={handleToggleDarkMode}
              />
            </Toolbar>
          </StyledAppBar>

          <Sidebar
            commodities={commodities.map(c => c.toLowerCase())}
            regimes={data?.regimes || ['unified', 'north', 'south']}
            selectedCommodity={selectedCommodity.toLowerCase()}
            setSelectedCommodity={handleCommodityChange}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedAnalysis={selectedAnalysis}
            setSelectedAnalysis={setSelectedAnalysis}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isSmUp={isSmUp}
            onMethodologyClick={() => handleModalToggle('methodology', true)}
            selectedRegimes={selectedGraphRegimes}
            setSelectedRegimes={setSelectedGraphRegimes}
            onOpenWelcomeModal={() => handleModalToggle('welcome', true)}
            handleDrawerToggle={handleDrawerToggle}
          />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
              ml: { sm: `${DRAWER_WIDTH}px` },
            }}
          >
            <Toolbar />
            <Dashboard
              spatialData={data}
              selectedCommodity={selectedCommodity}
              selectedDate={selectedDate}
              selectedRegimes={selectedGraphRegimes}
              selectedAnalysis={selectedAnalysis}
              windowWidth={windowSize.width}
              spatialViewConfig={spatialViewConfig}
              onSpatialViewChange={setSpatialViewConfig}
            />
          </Box>

          <StateExporter />

          <MethodologyModal
            open={modalStates.methodology}
            onClose={() => handleModalToggle('methodology', false)}
          />
          <WelcomeModal
            open={!hasSeenWelcome}
            onClose={handleWelcomeModalClose}
          />
        </Box>
      </EnhancedErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
