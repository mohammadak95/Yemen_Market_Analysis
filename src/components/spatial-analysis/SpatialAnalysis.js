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

const SpatialAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { geoData, flowMaps, analysisResults, loading, error } = useSpatialData();

  const geoCoordinates = useMemo(() => {
    if (!geoData?.features) return {};
    return geoData.features.reduce((acc, feature) => {
      if (feature.geometry?.coordinates) {
        acc[feature.properties.region_id] = {
          lng: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
        };
      }
      return acc;
    }, {});
  }, [geoData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const safeAnalysisResults = useMemo(() => {
    return Array.isArray(analysisResults) ? analysisResults : [];
  }, [analysisResults]);

  const currentAnalysis = useMemo(() => {
    return safeAnalysisResults.find(
      (r) => r.commodity === selectedCommodity && r.regime === selectedRegime
    );
  }, [safeAnalysisResults, selectedCommodity, selectedRegime]);

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

  if (!geoData || !flowMaps || safeAnalysisResults.length === 0) {
    return <ErrorMessage message="Some required data is missing. Please try again later." />;
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Spatial Analysis for {selectedCommodity} - {selectedRegime} Regime
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Spatial Analysis Tabs"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Residuals Map" />
        <Tab label="Flow Maps" />
        <Tab label="Diagnostics" />
        <Tab label="Regression Results" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <SpatialMap geoData={geoData} />}
        {activeTab === 1 && Object.keys(geoCoordinates).length > 0 && (
          <FlowMapsWithMap flowMaps={flowMaps} geoCoordinates={geoCoordinates} />
        )}
        {activeTab === 2 && (
          currentAnalysis ? (
            <DiagnosticsTests data={currentAnalysis} />
          ) : (
            <Typography variant="body1">
              No diagnostics data available for the selected commodity and regime.
            </Typography>
          )
        )}
        {activeTab === 3 && (
          currentAnalysis ? (
            <RegressionResults data={currentAnalysis} />
          ) : (
            <Typography variant="body1">
              No regression results available for the selected commodity and regime.
            </Typography>
          )
        )}
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SpatialAnalysis;