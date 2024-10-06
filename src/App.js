// src/App.js

import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Toolbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './features/themeSlice';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import { lightTheme, darkTheme } from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';

const App = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');

  // Fetch data once in App.js and pass it down
  const { data, loading, error } = useData();

  // State to manage sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isSmUp && sidebarOpen ? '240px 1fr' : '1fr',
          minHeight: '100vh',
        }}
      >
        <Header
          toggleSidebar={handleDrawerToggle}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => dispatch(toggleDarkMode())}
        />
        {(isSmUp || sidebarOpen) && (
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
          />
        )}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Toolbar />
          <Dashboard
            data={data} // Pass data down to Dashboard
            selectedCommodity={selectedCommodity}
            selectedRegime={selectedRegime}
            selectedAnalysis={selectedAnalysis}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;