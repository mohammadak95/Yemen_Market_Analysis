// src/App.js

import React, { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from './utils/themeSlice';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './Dashboard';
import { lightTheme, darkTheme } from './styles/theme';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import MethodologyModal from './components/methedology/MethodologyModal';
import GlobalStyle from './styles/GlobalStyle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LayoutContainer, MainContent } from './styles/LayoutStyles';

const App = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [methodologyModalOpen, setMethodologyModalOpen] = useState(false);

  const isSmUp = useMediaQuery(currentTheme.breakpoints.up('sm'));

  const { data, loading, error } = useData();

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
      <GlobalStyle />
      <LayoutContainer>
        {/* Sidebar */}
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

        {/* Main Content */}
        <MainContent sidebarOpen={sidebarOpen}>
          {/* Header */}
          <Header
            toggleSidebar={handleDrawerToggle}
            isDarkMode={isDarkMode}
            toggleDarkMode={() => dispatch(toggleDarkMode())}
          />

          {/* Dashboard */}
          <Dashboard
            data={data}
            selectedCommodity={selectedCommodity}
            selectedRegime={selectedRegime}
            selectedAnalysis={selectedAnalysis}
          />
        </MainContent>

        {/* Methodology Modal */}
        <MethodologyModal open={methodologyModalOpen} onClose={handleCloseMethodology} />
      </LayoutContainer>
    </ThemeProvider>
  );
};

export default App;
