// src/App.js
import React, { useState } from 'react';
import { ThemeProvider } from "styled-components";
import { useSelector } from "react-redux";
import GlobalStyle from "./styles/GlobalStyle";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Sidebar from "./components/common/Sidebar";
import Dashboard from "./Dashboard";
import { lightTheme, darkTheme } from "./styles/theme";
import styled from "styled-components";
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';


const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex-grow: 1;
  margin-left: 250px; // Adjust based on your sidebar width
`;

const App = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');
  const { data, loading, error } = useData();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyle />
      <AppContainer>
        <Sidebar
          commodities={data?.commodities || []}
          regimes={data?.regimes || []}
          selectedCommodity={selectedCommodity}
          setSelectedCommodity={setSelectedCommodity}
          selectedRegime={selectedRegime}
          setSelectedRegime={setSelectedRegime}
        />
        <MainContent>
          <Header />
          <Dashboard 
            selectedCommodity={selectedCommodity}
            selectedRegime={selectedRegime}
          />
          <Footer />
        </MainContent>
      </AppContainer>
    </ThemeProvider>
  );
};

export default App;