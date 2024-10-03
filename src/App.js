// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { useSelector } from 'react-redux';
import GlobalStyle from './styles/GlobalStyle';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Sidebar from './components/common/Sidebar';
import ECMAnalysis from './components/ecm-analysis/ECMAnalysis';
import PriceDifferentialAnalysis from './components/price-differential-analysis/PriceDifferentialAnalysis';
import SpatialAnalysis from './components/spatial-analysis/SpatialAnalysis';
import Dashboard from './components/Dashboard';
import NotFound from './components/common/NotFound'; // Ensure this component exists
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
`;

const MainContent = styled.main`
  margin-left: 250px; /* Width of the sidebar */
  width: calc(100% - 250px);
  padding: 20px;
`;

const App = () => {
  const theme = useSelector((state) => state.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <AppContainer>
          <Sidebar />
          <MainContent>
            <Header />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ecm" element={<ECMAnalysis />} />
              <Route path="/price-diff" element={<PriceDifferentialAnalysis />} />
              <Route path="/spatial" element={<SpatialAnalysis />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
          </MainContent>
        </AppContainer>
      </Router>
    </ThemeProvider>
  );
};

export default App;