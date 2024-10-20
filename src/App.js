// src/App.js

import React, { useState, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './utils/themeSlice';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import { lightThemeWithOverrides, darkThemeWithOverrides } from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import MethodologyModal from './components/methedology/MethodologyModal';
import TutorialsModal from './components/tutorials/TutorialsModal';
import WelcomeModal from './components/common/WelcomeModal';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LayoutContainer, MainContent, SidebarWrapper } from './styles/LayoutStyles';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppBar from '@mui/material/AppBar';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import useWindowSize from './hooks/useWindowSize';

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

const App = React.memo(function App() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const theme = useMemo(
    () => (isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides),
    [isDarkMode]
  );

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(isSmUp);

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);
  const [tutorialsModalOpen, setTutorialsModalOpen] = useState(false);
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  const { data, loading, error } = useData();

  const windowSize = useWindowSize();

  React.useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setWelcomeModalOpen(true);
    }
  }, []);

  React.useEffect(() => {
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

  const handleShowTutorials = useCallback(() => {
    setTutorialsModalOpen(true);
  }, []);

  const handleCloseTutorials = useCallback(() => {
    setTutorialsModalOpen(false);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const handleSetSelectedCommodity = useCallback((commodity) => {
    setSelectedCommodity(commodity);
  }, []);

  const handleSetSelectedAnalysis = useCallback((analysis) => {
    setSelectedAnalysis(analysis);
    if (analysis === 'tvmii') {
      // Any specific actions needed for TV-MII analysis
    }
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
                handleDrawerToggle={handleDrawerToggle}
                isSmUp={isSmUp}
              />
            </Toolbar>
          </StyledAppBar>

          <SidebarWrapper open={sidebarOpen && isSmUp}>
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
              onTutorialsClick={handleShowTutorials}
              selectedRegimes={selectedGraphRegimes}
              setSelectedRegimes={handleSetSelectedGraphRegimes}
              onOpenWelcomeModal={handleOpenWelcomeModal}
              handleDrawerToggle={handleDrawerToggle}
            />
          </SidebarWrapper>

          <MainContent>
            <Toolbar /> {/* This pushes content below the AppBar */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto',
              height: 'calc(100vh - 64px)', // Full height minus AppBar height
              padding: theme.spacing(2),
            }}>
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

          <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
          <TutorialsModal open={tutorialsModalOpen} onClose={handleCloseTutorials} />
          <WelcomeModal open={welcomeModalOpen} onClose={handleCloseWelcomeModal} />
        </LayoutContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
});

export default App;