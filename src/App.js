// src/App.js

import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  Toolbar,
  IconButton,
  Box,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';

import { toggleDarkMode } from './slices/themeSlice';
import { loadSpatialData, setSelectedCommodity } from './slices/spatialSlice';
import { spatialIntegrationSystem } from './utils/spatialIntegrationSystem';
import { spatialDebugUtils } from './utils/spatialDebugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';

import Header from './components/common/Header';
import Sidebar from './components/common/Navigation';
import Dashboard from './Dashboard';
import ErrorDisplay from './components/common/ErrorDisplay';
import MarketDataLoader from './components/common/MarketDataLoader';
import { useWindowSize } from './hooks';

import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';

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

  // State
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [modalStates, setModalStates] = useState({
    methodology: false,
    tutorials: false,
    welcome: false,
  });

  // Selectors
  const spatialStatus = useSelector((state) => state.spatial.status);
  const spatialData = useSelector((state) => state.spatial.data);
  const selectedCommodity = useSelector((state) => state.spatial.ui.selectedCommodity);
  const selectedRegimes = useSelector((state) => state.spatial.ui.selectedRegimes);
  const isLoading = useSelector(state => 
    state.spatial.status.loading || 
    !state.spatial.status.isInitialized
  );

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      const metric = backgroundMonitor.startMetric('app-initialization');
      
      try {
        await spatialIntegrationSystem.initialize();
        
        const defaultCommodity = 'beans_white'; // Changed from 'beans (kidney red)'
        dispatch(setSelectedCommodity(defaultCommodity));
        
        await dispatch(loadSpatialData({
          selectedCommodity: defaultCommodity,
          selectedDate: null
        })).unwrap();

        metric.finish({ status: 'success' });
        setIsInitializing(false);
        setError(null);
        
      } catch (err) {
        metric.finish({ status: 'error', error: err.message });
        setIsInitializing(false);
        setError(err.message);
        spatialDebugUtils.error('Failed to initialize application:', err);
      }
    };

    initialize();
  }, [dispatch]);

  // Effect to handle responsive sidebar
  useEffect(() => {
    setSidebarOpen(isSmUp);
  }, [isSmUp]);

  // Handlers
  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleModalToggle = useCallback((modalName, isOpen) => {
    setModalStates(prev => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Render loading state
  if (isInitializing || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor={theme.palette.background.default}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay
          error={error}
          title="Initialization Error"
          showDetails={process.env.NODE_ENV !== 'production'}
          onRetry={handleRetry}
        />
      </Box>
    );
  }

  // Render main app
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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

        <MarketDataLoader>
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            handleDrawerToggle={handleDrawerToggle}
            onMethodologyClick={() => handleModalToggle('methodology', true)}
            onTutorialsClick={() => handleModalToggle('tutorials', true)}
            selectedCommodity={selectedCommodity}
            selectedRegimes={selectedRegimes}
            isSmUp={isSmUp}
          />
        </MarketDataLoader>

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
          {spatialStatus.error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {spatialStatus.error}
            </Alert>
          ) : (
            <Dashboard
              data={spatialData}
              selectedCommodity={selectedCommodity}
              selectedRegimes={selectedRegimes}
              windowWidth={windowSize.width}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;