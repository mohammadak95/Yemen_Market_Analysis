// src/App.js

import React, { useState, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Toolbar, IconButton, Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './utils/themeSlice';
import MenuIcon from '@mui/icons-material/Menu';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import { lightThemeWithOverrides, darkThemeWithOverrides } from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import MethodologyModal from './components/methedology/MethodologyModal';
import GlobalStyle from './styles/GlobalStyle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LayoutContainer, MainContent, drawerWidth } from './styles/LayoutStyles';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import ErrorBoundary from './components/common/ErrorBoundary';


const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const App = React.memo(function App() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const theme = useMemo(() => isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides, [isDarkMode]);

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']);

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  const { data, loading, error } = useData();

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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const appBarShift = sidebarOpen && isSmUp;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyle />
      <ErrorBoundary>
        <LayoutContainer>
          <StyledAppBar position="fixed" open={appBarShift}>
            <Toolbar>
              {!sidebarOpen && isSmUp && (
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

          <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
        </LayoutContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
});

export default App;