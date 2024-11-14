// src/App.js

import React, { useState, useCallback, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box, useMediaQuery } from '@mui/material';
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
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedAnalysis,
  loadSpatialData,
} from './slices/spatialSlice';
import {
  selectSpatialStatus,
  selectSpatialData,
  selectSelectedCommodity,
  selectSelectedDate,
  selectSelectedAnalysis,
  selectSelectedRegimes,
} from './selectors/spatialSelectors';

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

  // Use memoized selectors to get spatial state
  const spatialStatus = useSelector(selectSpatialStatus);
  const spatialData = useSelector(selectSpatialData);
  const selectedCommodity = useSelector(selectSelectedCommodity);
  const selectedDate = useSelector(selectSelectedDate);
  const selectedAnalysis = useSelector(selectSelectedAnalysis);
  const selectedRegimes = useSelector(selectSelectedRegimes);

  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [modalStates, setModalStates] = useState({
    methodology: false,
    tutorials: false,
    welcome: false,
  });

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setModalStates((prev) => ({ ...prev, welcome: true }));
    }
  }, []);

  useEffect(() => {
    setSidebarOpen(isSmUp);
  }, [isSmUp]);

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

  // Load initial data if not already loaded
  useEffect(() => {
    if (!spatialData && !spatialStatus.loading) {
      dispatch(loadSpatialData({ selectedCommodity: selectedCommodity || 'defaultCommodity' }));
    }
  }, [dispatch, spatialData, spatialStatus.loading, selectedCommodity]);

  if (spatialStatus.loading && !spatialData) {
    return <LoadingSpinner />;
  }

  if (spatialStatus.error) {
    return (
      <ErrorDisplay
        error={spatialStatus.error}
        title="Application Error"
        showDetails={process.env.NODE_ENV !== 'production'}
        onRetry={() => dispatch(loadSpatialData({ selectedCommodity }))}
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
                onTutorialsClick={() => handleModalToggle('tutorials', true)}
              />
            </Toolbar>
          </StyledAppBar>

          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onMethodologyClick={() => handleModalToggle('methodology', true)}
            onTutorialsClick={() => handleModalToggle('tutorials', true)}
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
              data={spatialData}
              selectedCommodity={selectedCommodity}
              selectedRegimes={selectedRegimes}
              selectedDate={selectedDate}
              selectedAnalysis={selectedAnalysis}
              windowWidth={windowSize.width}
            />
          </Box>

          <MethodologyModal
            open={modalStates.methodology}
            onClose={() => handleModalToggle('methodology', false)}
          />
          <TutorialsModal
            open={modalStates.tutorials}
            onClose={() => handleModalToggle('tutorials', false)}
          />
          <WelcomeModal open={modalStates.welcome} onClose={handleWelcomeModalClose} />
        </Box>
      </EnhancedErrorBoundary>
    </ThemeProvider>
  );
};

export default App;