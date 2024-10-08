//src/App.js

import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, IconButton, Box } from '@mui/material';
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
import { LayoutContainer, MainContent, useLayoutStylesWithTheme } from './styles/LayoutStyles';

function App() {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const theme = isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides;
  const classes = useLayoutStylesWithTheme();

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);

  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  const { data, loading, error } = useData();

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleShowMethodology = () => setMethodologyModalOpen(true);
  const handleCloseMethodology = () => setMethodologyModalOpen(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyle />
      <LayoutContainer>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              className={classes.menuButton}
            >
              <MenuIcon />
            </IconButton>
            <Header
              toggleSidebar={handleDrawerToggle}
              isDarkMode={isDarkMode}
              toggleDarkMode={() => dispatch(toggleDarkMode())}
            />
          </Toolbar>
        </AppBar>
        <Sidebar
          commodities={data?.commodities || []}
          regimes={data?.regimes || []}
          selectedCommodity={selectedCommodity}
          setSelectedCommodity={setSelectedCommodity}
          selectedRegime={selectedRegime}
          setSelectedRegime={setSelectedRegime}
          selectedAnalysis={selectedAnalysis}
          setSelectedAnalysis={setSelectedAnalysis}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSmUp={isSmUp}
          onMethodologyClick={handleShowMethodology}
        />
        <MainContent open={sidebarOpen}>
          <Box component="main" className={classes.content}>
            <Box className={classes.toolbar} />
            <Dashboard
              data={data}
              selectedCommodity={selectedCommodity}
              selectedRegime={selectedRegime}
              selectedAnalysis={selectedAnalysis}
            />
          </Box>
        </MainContent>
        <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
      </LayoutContainer>
    </ThemeProvider>
  );
}

export default App;