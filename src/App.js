// src/App.js

import React, { useState, useCallback, useEffect } from 'react';
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
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorDisplay from './components/common/ErrorDisplay';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { TutorialsModal } from './components/discovery/Tutorials';
import WelcomeModal from './components/common/WelcomeModal';
import { useWindowSize } from './hooks';
import { usePrecomputedData } from './hooks/usePrecomputedData';
import { backgroundMonitor } from './utils/backgroundMonitor';
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import { DiscoveryProvider } from './context/DiscoveryContext';
import { SpatialDataProvider } from './context/SpatialDataContext';
import { COMMODITIES } from './constants/index';

const DRAWER_WIDTH = 240;

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

const App = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode ?? false);
  const theme = React.useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const windowSize = useWindowSize();

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);
  const [spatialViewConfig, setSpatialViewConfig] = useState({
    center: [15.3694, 44.191],
    zoom: 6,
  });
  const [modalStates, setModalStates] = useState({
    methodology: false,
    tutorials: false,
    welcome: false,
  });

  // Load precomputed data
  const { data, loading, error } = usePrecomputedData(
    selectedCommodity,
    selectedDate
  );

  // Initialize welcome modal
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setModalStates((prev) => ({ ...prev, welcome: true }));
    }
  }, []);

  // Track initial data load
  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      backgroundMonitor.logMetric('app-initial-load', {
        commodity: selectedCommodity,
        date: selectedDate,
      });
    }
  }, [selectedCommodity, selectedDate]);

  // Sync sidebar with screen size
  useEffect(() => {
    setSidebarOpen(isSmUp);
  }, [isSmUp]);

  // Event handlers
  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleModalToggle = useCallback((modalName, isOpen) => {
    setModalStates((prev) => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const handleWelcomeModalClose = useCallback((dontShowAgain) => {
    setModalStates((prev) => ({ ...prev, welcome: false }));
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []);

  const handleCommodityChange = useCallback((commodity) => {
    setSelectedCommodity(commodity);
    // Reset date to trigger data load with latest available date
    setSelectedDate('');
  }, []);

  // Render content based on loading state
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

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

    const dashboardProps = {
      selectedCommodity,
      selectedDate,
      selectedAnalysis,
      selectedRegimes: selectedGraphRegimes,
      windowWidth: windowSize.width,
      spatialViewConfig,
      onSpatialViewChange: setSpatialViewConfig,
      data,
    };

    return (
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
              onTutorialsClick={() => handleModalToggle('tutorials', true)}
            />
          </Toolbar>
        </StyledAppBar>

        <Sidebar
          commodities={COMMODITIES.FOOD}
          selectedCommodity={selectedCommodity}
          setSelectedCommodity={handleCommodityChange}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedAnalysis={selectedAnalysis}
          setSelectedAnalysis={setSelectedAnalysis}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSmUp={isSmUp}
          onMethodologyClick={() => handleModalToggle('methodology', true)}
          onTutorialsClick={() => handleModalToggle('tutorials', true)}
          selectedRegimes={selectedGraphRegimes}
          setSelectedRegimes={setSelectedGraphRegimes}
          onOpenWelcomeModal={() => handleModalToggle('welcome', true)}
          handleDrawerToggle={handleDrawerToggle}
          availableDates={data?.timeSeriesData?.map(d => d.month) || []}
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
          <Dashboard {...dashboardProps} />
        </Box>

        <MethodologyModal
          open={modalStates.methodology}
          onClose={() => handleModalToggle('methodology', false)}
        />
        <TutorialsModal
          open={modalStates.tutorials}
          onClose={() => handleModalToggle('tutorials', false)}
        />
        <WelcomeModal
          open={modalStates.welcome}
          onClose={handleWelcomeModalClose}
        />
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SpatialDataProvider>
        <DiscoveryProvider>
          <EnhancedErrorBoundary>
            {renderContent()}
          </EnhancedErrorBoundary>
        </DiscoveryProvider>
      </SpatialDataProvider>
    </ThemeProvider>
  );
};

export default App;