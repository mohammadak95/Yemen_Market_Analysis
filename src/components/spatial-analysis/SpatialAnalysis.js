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
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import SpatialMap from './SpatialMap';
import FlowMapsWithMap from './FlowMapsWithMap';
import DiagnosticsTests from './DiagnosticsTests';
import RegressionResults from './RegressionResults';
import useSpatialData from '../../hooks/useSpatialData';
import ErrorMessage from '../common/ErrorMessage';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../utils/jsonToCsv';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

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
        (feature) => feature.properties.commodity === selectedCommodity
      ),
    };
  }, [geoData, selectedCommodity]);

  const currentAnalysis = useMemo(() => {
    return analysisResults?.find((r) => r.commodity === selectedCommodity);
  }, [analysisResults, selectedCommodity]);

  // Handle Download as CSV
  const handleDownloadCsv = () => {
    if (!currentAnalysis) {
      console.warn('No spatial analysis data available to download.');
      return;
    }

    const dataToDownload = {
      // Add data fields to download
      ...currentAnalysis,
    };

    const csv = jsonToCsv([dataToDownload]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_Spatial_Analysis.csv`);
  };

  // Loading State
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        minHeight="200px"
        mt={4}
      >
        <CircularProgress size={60} />
        <Typography
          variant="body1"
          sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}
        >
          Loading Spatial Analysis results...
        </Typography>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <ErrorMessage message={`Error loading spatial data: ${error}`} />
      </Box>
    );
  }

  // No Data State
  if (!selectedCommodity || !filteredGeoData) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No spatial data available for {selectedCommodity}.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: 4,
        p: { xs: 1, sm: 2 },
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          gutterBottom
          sx={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            fontSize: isMobile ? '1.5rem' : '2rem',
          }}
        >
          Spatial Analysis for {selectedCommodity}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
          >
            Download CSV
          </Button>
        </Box>
      </Box>

      {/* Tabs for Different Views */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Spatial Analysis Tabs"
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{
          mt: 2,
          flexWrap: 'wrap',
          '& .MuiTabs-flexContainer': {
            justifyContent: 'center',
          },
        }}
      >
        <Tab
          label="Residuals Map"
          sx={{
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.8rem' : '1rem',
          }}
        />
        <Tab
          label="Flow Map"
          sx={{
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.8rem' : '1rem',
          }}
        />
        <Tab
          label="Diagnostics"
          sx={{
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.8rem' : '1rem',
          }}
        />
        <Tab
          label="Regression Results"
          sx={{
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.8rem' : '1rem',
          }}
        />
      </Tabs>

      {/* Content Based on Active Tab */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && filteredGeoData && (
          <SpatialMap
            geoData={filteredGeoData}
            isMobile={isMobile}
            windowWidth={windowWidth}
          />
        )}
        {activeTab === 1 && flowMaps && (
          <FlowMapsWithMap
            flowMaps={flowMaps}
            isMobile={isMobile}
            windowWidth={windowWidth}
          />
        )}
        {activeTab === 2 && currentAnalysis ? (
          <DiagnosticsTests data={currentAnalysis} isMobile={isMobile} />
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No diagnostics data available for the selected commodity.
          </Typography>
        )}
        {activeTab === 3 && currentAnalysis ? (
          <RegressionResults data={currentAnalysis} isMobile={isMobile} />
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No regression results available for the selected commodity.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default SpatialAnalysis;