// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { useSelector } from "react-redux";
import GlobalStyle from "./styles/GlobalStyle";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Sidebar from "./components/common/Sidebar";
import ECMAnalysis from "./components/ecm-analysis/ECMAnalysis";
import PriceDifferentialAnalysis from "./components/price-differential-analysis/PriceDifferentialAnalysis";
import SpatialAnalysis from "./components/spatial-analysis/SpatialAnalysis";
import Dashboard from "./Dashboard";
import NotFound from "./components/common/NotFound";
import { lightTheme, darkTheme } from "./styles/theme";
import styled from "styled-components";

const AppContainer = styled.div`
  display: flex;
  background-color: ${(props) => props.theme.backgroundColor};
  color: ${(props) => props.theme.textColor};
  min-height: 100vh;
`;

const MainContent = styled.main`
  margin-left: ${({ isSidebarOpen }) => (isSidebarOpen ? "250px" : "0")};
  width: ${({ isSidebarOpen }) => (isSidebarOpen ? "calc(100% - 250px)" : "100%")};
  padding: 20px;
  transition: margin-left 0.3s ease-in-out, width 0.3s ease-in-out;

  @media (max-width: 768px) {
    margin-left: ${({ isSidebarOpen }) => (isSidebarOpen ? "200px" : "0")};
    width: ${({ isSidebarOpen }) => (isSidebarOpen ? "calc(100% - 200px)" : "100%")};
  }

  @media (max-width: 480px) {
    margin-left: ${({ isSidebarOpen }) => (isSidebarOpen ? "180px" : "0")};
    width: ${({ isSidebarOpen }) => (isSidebarOpen ? "calc(100% - 180px)" : "100%")};
  }
`;

const App = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyle />
      <Router>
        <AppContainer>
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
          <MainContent isSidebarOpen={isSidebarOpen}>
            <Header toggleSidebar={toggleSidebar} />
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