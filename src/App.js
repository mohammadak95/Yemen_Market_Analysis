import React, { useState, useCallback, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import { toggleDarkMode } from './slices/themeSlice';
import { fetchFlowData } from './slices/flowSlice';
import Header from './components/common/Header';
import { Sidebar } from './components/common/Navigation';
import Dashboard from './Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorDisplay from './components/common/ErrorDisplay';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { WelcomeModal } from './components/common/WelcomeModal';
import StateExporter from './components/utils/StateExporter';
import { setHasSeenWelcome } from './store/welcomeModalSlice';
import { useWindowSize } from './hooks';
import { backgroundMonitor, MetricTypes } from './utils/backgroundMonitor';
import { fetchAllSpatialData } from './slices/spatialSlice';
import { useAppState } from './hooks/useAppState';
import { initializeStore } from './store';

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

const App = () => {
  const {
    dispatch,
    data,
    loading,
    error,
    hasSeenWelcome,
    isDarkMode,
    commodities,
    theme,
  } = useAppState();

  const appInitialized = useRef(false);
  const storeInitialized = useRef(false);
  const abortController = useRef(null);

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const windowSize = useWindowSize();

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
    methodology: false,
  });

  // Initialize store first
  useEffect(() => {
    const initStore = async () => {
      if (storeInitialized.current) return;
      try {
        await initializeStore();
        storeInitialized.current = true;
      } catch (error) {
        console.error('Failed to initialize store:', error);
      }
    };
    initStore();
  }, []);

  // Then initialize app data after store is ready
  useEffect(() => {
    const initializeApp = async () => {
      if (!storeInitialized.current || appInitialized.current || loading) return;

      const initMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        component: 'app',
        startTime: performance.now()
      });

      try {
        // Create new abort controller if needed
        if (!abortController.current) {
          abortController.current = new AbortController();
        }

        // Initial data load
        await dispatch(fetchAllSpatialData({ 
          commodity: '', 
          date: DEFAULT_DATE,
          signal: abortController.current?.signal
        }));

        // Set initial commodity after data load
        if (commodities.length > 0) {
          const initialCommodity = commodities[0]?.toLowerCase();
          if (initialCommodity && !selectedCommodity) {
            setSelectedCommodity(initialCommodity);
            await dispatch(fetchAllSpatialData({ 
              commodity: initialCommodity, 
              date: DEFAULT_DATE,
              signal: abortController.current?.signal
            }));
          }
        }

        appInitialized.current = true;
        initMetric.finish({ 
          status: 'success',
          initTime: performance.now() - initMetric.startTime
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error initializing app:', err);
          initMetric.finish({ 
            status: 'error',
            error: err.message
          });
        }
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = null;
      }
    };
  }, [loading, dispatch, commodities, selectedCommodity, storeInitialized]);

  const handleCommodityChange = useCallback((newCommodity) => {
    if (!newCommodity || newCommodity === selectedCommodity || loading) return;

    // Cancel any existing request
    if (abortController.current) {
      abortController.current.abort();
    }

    setSelectedCommodity(newCommodity);
    
    // Create new abort controller
    abortController.current = new AbortController();
    
    const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
      action: 'commodity-change',
      commodity: newCommodity
    });
    
    Promise.all([
      dispatch(fetchAllSpatialData({ 
        commodity: newCommodity, 
        date: selectedDate,
        signal: abortController.current?.signal
      })),
      dispatch(fetchFlowData({ 
        commodity: newCommodity, 
        date: selectedDate,
        signal: abortController.current?.signal
      }))
    ]).then(() => {
      metric.finish({ status: 'success' });
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        metric.finish({ status: 'error', error: error.message });
        console.error('Error loading commodity data:', error);
      }
    });
  }, [selectedCommodity, selectedDate, loading, dispatch]);

  const handleDateChange = useCallback((newDate) => {
    if (newDate && newDate !== selectedDate) {
      setSelectedDate(newDate);
      if (selectedCommodity) {
        const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
          action: 'date-change',
          date: newDate
        });
        
        // Create new abort controller for date change
        if (abortController.current) {
          abortController.current.abort();
        }
        abortController.current = new AbortController();

        Promise.all([
          dispatch(fetchAllSpatialData({ 
            commodity: selectedCommodity, 
            date: newDate,
            signal: abortController.current?.signal
          })),
          dispatch(fetchFlowData({ 
            commodity: selectedCommodity, 
            date: newDate,
            signal: abortController.current?.signal
          }))
        ]).then(() => {
          metric.finish({ status: 'success' });
        }).catch((error) => {
          if (error.name !== 'AbortError') {
            metric.finish({ status: 'error', error: error.message });
            console.error('Error loading date data:', error);
          }
        });
      }
    }
  }, [selectedCommodity, selectedDate, dispatch]);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleModalToggle = useCallback((modalName, isOpen) => {
    if (modalName === 'welcome') return;
    setModalStates((prev) => ({ ...prev, [modalName]: isOpen }));
  }, []);

  const handleWelcomeModalClose = useCallback((dontShowAgain) => {
    dispatch(setHasSeenWelcome(dontShowAgain));
  }, [dispatch]);

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Application Error"
        showDetails={process.env.NODE_ENV === 'development'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!storeInitialized.current) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <LoadingSpinner message="Initializing application..." />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EnhancedErrorBoundary>
        <Box 
          sx={{ display: 'flex', minHeight: '100vh' }}
          className={isDarkMode ? 'mui-dark-mode' : ''}
        >
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
            commodities={commodities.map((c) => c.toLowerCase())}
            regimes={data?.regimes || ['unified', 'north', 'south']}
            selectedCommodity={selectedCommodity.toLowerCase()}
            setSelectedCommodity={handleCommodityChange}
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
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
            {loading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}>
                <LoadingSpinner />
              </Box>
            ) : (
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
            )}
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
