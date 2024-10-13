// src/components/spatial-analysis/SpatialAnalysis.js

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import SpatialMap from './SpatialMap';
import FlowMapsWithMap from './FlowMapsWithMap';
import DiagnosticsTests from './DiagnosticsTests';
import RegressionResults from './RegressionResults';
import useSpatialData from '../../hooks/useSpatialData';
import ErrorMessage from '../common/ErrorMessage';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { geoData, flowMaps, analysisResults, loading, error } = useSpatialData();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const filteredGeoData = useMemo(() => {
    if (!geoData || !selectedCommodity) return null;
    return {
      ...geoData,
      features: geoData.features.filter(
        feature => feature.properties.commodity === selectedCommodity
      ),
    };
  }, [geoData, selectedCommodity]);

  const currentAnalysis = useMemo(() => {
    return analysisResults?.find(r => r.commodity === selectedCommodity);
  }, [analysisResults, selectedCommodity]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage message={`Error loading spatial data: ${error}`} />;
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Spatial Analysis for {selectedCommodity}
      </Typography>

      {/* Tabs for Different Views */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Spatial Analysis Tabs"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Residuals Map" />
        <Tab label="Flow Map" />
        <Tab label="Diagnostics" />
        <Tab label="Regression Results" />
      </Tabs>

      {/* Content Based on Active Tab */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && filteredGeoData && (
          <SpatialMap geoData={filteredGeoData} />
        )}
        {activeTab === 1 && flowMaps && (
          <FlowMapsWithMap flowMaps={flowMaps} />
        )}
        {activeTab === 2 && currentAnalysis ? (
          <DiagnosticsTests data={currentAnalysis} />
        ) : (
          <Typography variant="body1">
            No diagnostics data available for the selected commodity.
          </Typography>
        )}
        {activeTab === 3 && currentAnalysis ? (
          <RegressionResults data={currentAnalysis} />
        ) : (
          <Typography variant="body1">
            No regression results available for the selected commodity.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
};

export default SpatialAnalysis;