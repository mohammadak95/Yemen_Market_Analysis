// src/components/spatial-analysis/SpatialAnalysis.js

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Tooltip as MuiTooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AnimatedFlowMap from './AnimatedFlowMap';
import DiagnosticsTests from './DiagnosticsTests';
import RegressionResults from './RegressionResults';
import SpatialNetworkGraph from './SpatialNetworkGraph';
import ChoroplethMap from './ChoroplethMap';
import useSpatialData from '../../hooks/useSpatialData';
import ErrorMessage from '../common/ErrorMessage';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../utils/jsonToCsv';
import { useTheme } from '@mui/material/styles';
import TimeSlider from './TimeSlider';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [activeTab, setActiveTab] = useState(1);
  const { geoData, geoBoundaries, flowMaps, analysisResults, loading, error, dateRange } = useSpatialData();
  
  const [selectedDate, setSelectedDate] = useState(() => dateRange.max.getTime());

  // Ensure selectedDate is set only once after data load
  useEffect(() => {
    setSelectedDate(dateRange.max.getTime());
  }, [dateRange]);

  // Deduplication Logic for filteredGeoData
  const filteredGeoData = useMemo(() => {
    if (!geoData || !selectedCommodity) return null;

    const uniqueFeaturesMap = new Map();
    geoData.features.forEach((feature) => {
      const { region_id, date, commodity, usdprice } = feature.properties;

      // Validate date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.warn('Invalid date:', date);
        return; // Skip invalid dates
      }

      if (
        commodity === selectedCommodity &&
        typeof usdprice === 'number' &&
        parsedDate.getTime() <= selectedDate
      ) {
        const key = `${region_id}-${date}`;
        if (!uniqueFeaturesMap.has(key)) {
          uniqueFeaturesMap.set(key, {
            ...feature,
            properties: {
              ...feature.properties,
              price: usdprice,
            },
          });
        }
      }
    });

    const deduplicatedFeatures = Array.from(uniqueFeaturesMap.values());

    if (deduplicatedFeatures.length === 0) {
      console.warn(`No price data found for commodity: ${selectedCommodity}`);
      return null;
    }

    return {
      ...geoData,
      features: deduplicatedFeatures,
    };
  }, [geoData, selectedCommodity, selectedDate]);

  const commodityDateRange = useMemo(() => {
    if (!filteredGeoData || filteredGeoData.features.length === 0) {
      return { min: new Date(), max: new Date() };
    }

    const dates = new Set(filteredGeoData.features.map(feature => feature.properties.date));
    const sortedDates = Array.from(dates).sort((a, b) => new Date(a) - new Date(b));

    return {
      min: new Date(sortedDates[0]),
      max: new Date(sortedDates[sortedDates.length - 1])
    };
  }, [filteredGeoData]);

  const currentAnalysis = useMemo(() => {
    return analysisResults?.find((r) => r.commodity === selectedCommodity);
  }, [analysisResults, selectedCommodity]);

  const handleDownloadCsv = useCallback(() => {
    if (!currentAnalysis) {
      console.warn('No spatial analysis data available to download.');
      return;
    }

    const dataToDownload = {
      ...currentAnalysis,
    };

    const csv = jsonToCsv([dataToDownload]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_Spatial_Analysis.csv`);
  }, [currentAnalysis, selectedCommodity]);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const handleDateChange = useCallback((event, newValue) => {
    setSelectedDate(newValue);
  }, []);

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

  if (error) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <ErrorMessage message={`Error loading spatial data: ${error}`} />
      </Box>
    );
  }

  if (!selectedCommodity || !filteredGeoData || filteredGeoData.features.length === 0) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No spatial data available for <strong>{selectedCommodity}</strong>.
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
          <MuiTooltip title="Spatial Analysis examines the geographical distribution and relationships related to the selected commodity.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </MuiTooltip>
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
            size="medium"
            sx={{
              minWidth: '140px',
              height: '36px',
              fontSize: '0.9rem',
              padding: '6px 16px',
            }}
          >
            Download CSV
          </Button>
        </Box>
      </Box>

      {!loading && geoData && (
        <TimeSlider
          minDate={commodityDateRange.min}
          maxDate={commodityDateRange.max}
          value={selectedDate}
          onChange={handleDateChange}
        />
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Spatial Analysis Tabs"
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{
          mt: 2,
          flexWrap: 'nowrap',
          '& .MuiTabs-flexContainer': {
            justifyContent: 'center',
          },
        }}
        TabIndicatorProps={{
          style: {
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        <Tab
          label="Animated Flow Map"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Choropleth Map"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Network Graph"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Diagnostics"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Regression Results"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && flowMaps && (
          <AnimatedFlowMap flowMaps={flowMaps} selectedCommodity={selectedCommodity} />
        )}
        {activeTab === 1 && (
          <ChoroplethMap 
            selectedCommodity={selectedCommodity}
            enhancedData={filteredGeoData}
            geoBoundaries={geoBoundaries}
            selectedDate={new Date(selectedDate)}
          />
        )}
        {activeTab === 2 && flowMaps && geoData && (
          <SpatialNetworkGraph
            selectedCommodity={selectedCommodity}
            flowMaps={flowMaps}
            geoData={geoData}
          />
        )}
        {activeTab === 3 && currentAnalysis ? (
          <DiagnosticsTests data={currentAnalysis} />
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No diagnostics data available for the selected commodity.
          </Typography>
        )}
        {activeTab === 4 && currentAnalysis ? (
          <RegressionResults data={currentAnalysis} />
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No regression results available for the selected commodity.
          </Typography>
        )}
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" component="div" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            This spatial analysis provides insights into the geographical distribution and relationships of {selectedCommodity} prices and conflict intensity. Key points to consider:
            <ul>
              <li>
                The <strong>Animated Flow Map</strong> shows the movement of {selectedCommodity} between regions over time.
              </li>
              <li>
                The <strong>Choropleth Map</strong> displays the distribution of {selectedCommodity} prices across different regions.
              </li>
              <li>
                The <strong>Network Graph</strong> illustrates the connections and interdependencies between different markets.
              </li>
              <li>
                The <strong>Diagnostics</strong> tab provides statistical tests to validate the spatial analysis.
              </li>
              <li>
                The <strong>Regression Results</strong> show the relationship between various factors and {selectedCommodity} prices.
              </li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default SpatialAnalysis;