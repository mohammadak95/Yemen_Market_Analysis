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
} from '@mui/material';
import SpatialMap from './SpatialMap';
import RegressionResults from './RegressionResults';
import DiagnosticsTests from './DiagnosticsTests';
import useSpatialData from '../../hooks/useSpatialData';
import { getDataPath } from '../../utils/dataPath';

const SpatialAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const { geoData, loading: spatialLoading, error: spatialError } = useSpatialData();
  const [activeTab, setActiveTab] = useState(0);
  const [spatialResults, setSpatialResults] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch spatial analysis results
    const fetchSpatialResults = async () => {
      setStatus('loading');
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
        setStatus('succeeded');
      } catch (err) {
        console.error('Error fetching spatial analysis results:', err);
        setError(err);
        setStatus('failed');
      }
    };

    fetchSpatialResults();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (spatialLoading || status === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading Spatial Analysis results...
        </Typography>
      </Box>
    );
  }

  if (spatialError || status === 'failed') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Error: {error?.message || spatialError?.message}
        </Typography>
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
        <Typography>
          No spatial analysis results available for {selectedCommodity} in {selectedRegime} regime.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Spatial Analysis: {selectedCommodity} - {selectedRegime} Regime
        </Typography>
      </Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mt: 2 }}>
        <Tab label="Spatial Map" />
        <Tab label="Regression Results" />
        <Tab label="Diagnostics Tests" />
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
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SpatialAnalysis;
