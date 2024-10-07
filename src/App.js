// src/App.js

import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './features/themeSlice';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import { lightTheme, darkTheme } from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import MethodologyModal from './components/methedology/MethodologyModal';

const App = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);

  const { data, loading, error } = useData();

  const isSmUp = useMediaQuery(currentTheme.breakpoints.up('sm'));

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleShowMethodology = () => setMethodologyModalOpen(true);
  const handleCloseMethodology = () => setMethodologyModalOpen(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header
          toggleSidebar={handleDrawerToggle}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => dispatch(toggleDarkMode())}
        />
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
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${sidebarOpen ? 240 : 0}px)` },
            ml: { sm: `${sidebarOpen ? 240 : 0}px` },
            transition: 'width 0.3s ease, margin-left 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Dashboard
            data={data}
            selectedCommodity={selectedCommodity}
            selectedRegime={selectedRegime}
            selectedAnalysis={selectedAnalysis}
          />
        </Box>
      </Box>
      <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
    </ThemeProvider>
  );
};

export default App;
