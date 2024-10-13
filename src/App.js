// src/App.js

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Toolbar, IconButton } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './utils/themeSlice';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import {
  lightThemeWithOverrides,
  darkThemeWithOverrides,
} from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import MethodologyModal from './components/methedology/MethodologyModal';
import WelcomeModal from './WelcomeModal';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  LayoutContainer,
  MainContent,
  drawerWidth,
} from './styles/LayoutStyles';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppBar from '@mui/material/AppBar';
import MenuIcon from '@mui/icons-material/Menu';

// Corrected StyledAppBar without using 'isSmUp'
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  // Apply margin and width adjustments only on 'sm' and up
  [theme.breakpoints.up('sm')]: {
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
    }),
  },
}));

const App = React.memo(function App() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const theme = useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  // Initialize sidebarOpen based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState([
    'unified',
  ]);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  const { data, loading, error } = useData();

  // Handle Welcome Modal on first load
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setWelcomeModalOpen(true);
    }
  }, []);

  // Adjust sidebar open state based on screen size
  useEffect(() => {
    setSidebarOpen(isSmUp);
  }, [isSmUp]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prevOpen) => !prevOpen);
  }, []);

  const handleShowMethodology = useCallback(() => {
    setMethodologyModalOpen(true);
  }, []);

  const handleCloseMethodology = useCallback(() => {
    setMethodologyModalOpen(false);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleSetSelectedCommodity = useCallback((commodity) => {
    setSelectedCommodity(commodity);
  }, []);

  const handleSetSelectedAnalysis = useCallback((analysis) => {
    setSelectedAnalysis(analysis);
  }, []);

  const handleSetSelectedGraphRegimes = useCallback((regimes) => {
    setSelectedGraphRegimes(regimes);
  }, []);

  const handleOpenWelcomeModal = useCallback(() => {
    setWelcomeModalOpen(true);
  }, []);

  const handleCloseWelcomeModal = useCallback((dontShowAgain) => {
    setWelcomeModalOpen(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <LayoutContainer>
          <StyledAppBar position="fixed" open={sidebarOpen && isSmUp}>
            <Toolbar>
              {(!isSmUp || !sidebarOpen) && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ marginRight: 2 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Header
                isDarkMode={isDarkMode}
                toggleDarkMode={handleToggleDarkMode}
              />
            </Toolbar>
          </StyledAppBar>

          <Sidebar
            commodities={data?.commodities || []}
            regimes={data?.regimes || []}
            selectedCommodity={selectedCommodity}
            setSelectedCommodity={handleSetSelectedCommodity}
            selectedAnalysis={selectedAnalysis}
            setSelectedAnalysis={handleSetSelectedAnalysis}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isSmUp={isSmUp}
            onMethodologyClick={handleShowMethodology}
            selectedRegimes={selectedGraphRegimes}
            setSelectedRegimes={handleSetSelectedGraphRegimes}
            onOpenWelcomeModal={handleOpenWelcomeModal}
          />

          <MainContent open={sidebarOpen && isSmUp}>
            <Box component="main">
              <Toolbar />
              <Dashboard
                data={data}
                selectedCommodity={selectedCommodity}
                selectedRegimes={selectedGraphRegimes}
                selectedAnalysis={selectedAnalysis}
              />
            </Box>
          </MainContent>

          {/* Methodology Modal */}
          <MethodologyModal
            open={methodologyModalOpen}
            onClose={handleCloseMethodology}
          />

          {/* Welcome Modal */}
          <WelcomeModal
            open={welcomeModalOpen}
            onClose={handleCloseWelcomeModal}
          />
        </LayoutContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
});

export default App;