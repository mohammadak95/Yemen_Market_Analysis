// src/components/spatial-analysis/SpatialAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import SpatialMap from './SpatialMap';
import RegressionResults from './RegressionResults';
import DiagnosticsTests from './DiagnosticsTests';
import FlowMaps from './FlowMaps';
import useSpatialData from '../../hooks/useSpatialData';
import { getDataPath } from '../../utils/dataPath';

const SpatialAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const { geoData, flowMaps, loading, error } = useSpatialData();
  const [activeTab, setActiveTab] = useState(0);

  const [spatialResults, setSpatialResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState(null);

  useEffect(() => {
    // Fetch spatial analysis results
    const fetchSpatialResults = async () => {
      setResultsLoading(true);
      try {
        const path = getDataPath('spatial_analysis_results.json');
        const response = await fetch(path, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch spatial analysis results: ${response.status}`);
        }

        const jsonData = await response.json();
        setSpatialResults(jsonData);
        setResultsLoading(false);
      } catch (err) {
        console.error('Error fetching spatial analysis results:', err);
        setResultsError(err);
        setResultsLoading(false);
      }
    };

    fetchSpatialResults();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Determine loading and error states
  const isLoading = loading || resultsLoading;
  const hasError = error || resultsError;

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading Spatial Analysis results...
        </Typography>
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Error: {error?.message || resultsError?.message}
        </Alert>
      </Box>
    );
  }

  if (!spatialResults || !geoData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>
          No spatial analysis data available.
        </Typography>
      </Box>
    );
  }

  // Filter the spatialResults for the selectedCommodity and selectedRegime
  const filteredResults = spatialResults.find(
    (result) =>
      result.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
      result.regime.toLowerCase() === selectedRegime.toLowerCase()
  );

  if (!filteredResults) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          No spatial analysis results available for <strong>{selectedCommodity}</strong> in <strong>{selectedRegime}</strong> regime.
        </Alert>
      </Box>
    );
  }

  // Extract unique regions for FlowMaps
  const uniqueRegions = geoData.features.map((feature) => ({
    region_id: feature.properties.region_id,
    geometry: feature.geometry,
  }));

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Spatial Analysis: {selectedCommodity} - {selectedRegime} Regime
        </Typography>
      </Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mt: 2 }}>
        <Tab label="Spatial Map" />
        <Tab label="Regression Results" />
        <Tab label="Diagnostics Tests" />
        <Tab label="Flow Maps" />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {activeTab === 0 && (
          <SpatialMap
            geoData={geoData}
            selectedCommodity={selectedCommodity}
            selectedRegime={selectedRegime}
          />
        )}
        {activeTab === 1 && <RegressionResults data={filteredResults} />}
        {activeTab === 2 && <DiagnosticsTests data={filteredResults} />}
        {activeTab === 3 && (
          <FlowMaps
            flowMaps={flowMaps}
            uniqueRegions={uniqueRegions}
          />
        )}
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired, // Now expects a string
};

export default SpatialAnalysis;
