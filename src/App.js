// src/App.js

import React, { useState } from 'react';
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

function App() {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const theme = isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides;

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);

  // **State for Graph Regimes**
  const [selectedGraphRegimes, setSelectedGraphRegimes] = useState(['unified']); // Default to 'unified'

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  const { data, loading, error } = useData();

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleShowMethodology = () => setMethodologyModalOpen(true);
  const handleCloseMethodology = () => setMethodologyModalOpen(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  // Styled AppBar that shifts based on sidebar state
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

  // Compute if AppBar should shift
  const appBarShift = sidebarOpen && isSmUp;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyle />
      <LayoutContainer>
        {/* AppBar (Header) */}
        <StyledAppBar position="fixed" open={appBarShift}>
          <Toolbar>
            {/* Show Menu Icon only when Sidebar is closed on large screens */}
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
            {/* Header Component */}
            <Header
              isDarkMode={isDarkMode}
              toggleDarkMode={() => dispatch(toggleDarkMode())}
            />
          </Toolbar>
        </StyledAppBar>

        {/* Sidebar */}
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
          onMethodologyClick={handleShowMethodology}
          // **Pass the graph regimes state and setter**
          selectedRegimes={selectedGraphRegimes}
          setSelectedRegimes={setSelectedGraphRegimes}
        />

        {/* Main Content */}
        <MainContent open={sidebarOpen && isSmUp}>
          <Box component="main">
            {/* Spacer to push content below AppBar */}
            <Toolbar />
            <Dashboard
              data={data}
              selectedCommodity={selectedCommodity}
              selectedRegimes={selectedGraphRegimes} // Pass the graph regimes
              selectedAnalysis={selectedAnalysis}
            />
          </Box>
        </MainContent>

        {/* Methodology Modal */}
        <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
      </LayoutContainer>
    </ThemeProvider>
  );
}

export default App;