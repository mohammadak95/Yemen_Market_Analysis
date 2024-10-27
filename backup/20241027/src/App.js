// src/App.js

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './slices/index';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';

// Components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import ErrorBoundary from './components/common/ErrorBoundary';
import MethodologyModal from './components/methodology/MethodologyModal';
import { TutorialsModal } from './components/discovery/Tutorials';
import WelcomeModal from './components/common/WelcomeModal';

// Hooks
import useMediaQuery from '@mui/material/useMediaQuery';
import useWindowSize from './hooks/useWindowSize';
import useData from './hooks/useData';

// Styles and Theme
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import {
  LayoutContainer,
  MainContent,
  SidebarWrapper,
} from './styles/LayoutStyles';

// Context
import { DiscoveryProvider } from './context/DiscoveryContext';

const drawerWidth = 240;

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['margin-left', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('sm')]: {
    width: `calc(100% - ${open ? drawerWidth : 0}px)`,
    marginLeft: open ? `${drawerWidth}px` : 0,
  },
}));

const Providers = ({ children }) => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const theme = React.useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DiscoveryProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </DiscoveryProvider>
    </ThemeProvider>
  );
};

Providers.propTypes = {
  children: PropTypes.node.isRequired,
};

const App = React.memo(function App() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  // Theme and media queries
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  // Fetch data
  const { data, loading, error } = useData();
  const windowSize = useWindowSize();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);
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

  // Loading and Error states
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <Providers>
      <LayoutContainer>
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
              onTutorialsClick={() => handleModalToggle('tutorials', true)} // Passes onTutorialsClick here
            />
          </Toolbar>
        </StyledAppBar>

        <SidebarWrapper open={sidebarOpen && isSmUp}>
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
        </SidebarWrapper>

        <MainContent>
          <Toolbar />
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              padding: theme.spacing(2),
            }}
          >
            <Dashboard
              data={data}
              selectedCommodity={selectedCommodity}
              selectedRegimes={selectedGraphRegimes}
              selectedAnalysis={selectedAnalysis}
              windowWidth={windowSize.width}
              sidebarOpen={sidebarOpen}
            />
          </Box>
        </MainContent>

        {/* Modals */}
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
      </LayoutContainer>
    </Providers>
  );
});

export default App;
