// src/App.js

import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';

// Import actions and selector
import { toggleDarkMode } from './slices/themeSlice';

// Import components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import ErrorBoundary from './components/common/ErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { TutorialsModal } from './components/discovery/Tutorials';
import WelcomeModal from './components/common/WelcomeModal';

// Import hooks
import useMediaQuery from '@mui/material/useMediaQuery';
import useWindowSize from './hooks/useWindowSize';
import useData from './hooks/useData';

// Import themes
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';

// Import context providers
import { DiscoveryProvider } from './context/DiscoveryContext';
import { WorkerProvider } from './context/WorkerContext';
import { SpatialDataProvider } from './context/SpatialDataContext';

// Constants
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

const App = React.memo(function App() {
  // Redux
  const dispatch = useDispatch();
  const isDarkMode = useSelector(state => state.theme?.isDarkMode ?? false);
  
  // Theme
  const theme = React.useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );
  
  // Hooks
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const windowSize = useWindowSize();
  const { data, loading, error } = useData();

  // State Management
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [selectedCommodity, setSelectedCommodity] = useState('');
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

  // Effects
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setModalStates((prev) => ({ ...prev, welcome: true }));
    }
  }, []);

  useEffect(() => {
    setSidebarOpen(isSmUp);
  }, [isSmUp]);

  // Handlers
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

  // Content rendering
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return <ErrorMessage message={error.message} />;
    }

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
          commodities={data?.commodities || []}
          regimes={data?.regimes || []}
          selectedCommodity={selectedCommodity}
          setSelectedCommodity={setSelectedCommodity}
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
            data={data}
            selectedCommodity={selectedCommodity}
            selectedRegimes={selectedGraphRegimes}
            selectedAnalysis={selectedAnalysis}
            windowWidth={windowSize.width}
            sidebarOpen={sidebarOpen}
            spatialViewConfig={spatialViewConfig}
            onSpatialViewChange={setSpatialViewConfig}
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
      <WorkerProvider>
        <SpatialDataProvider>
          <DiscoveryProvider>
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </DiscoveryProvider>
        </SpatialDataProvider>
      </WorkerProvider>
    </ThemeProvider>
  );
});

App.displayName = 'App';

export default App;