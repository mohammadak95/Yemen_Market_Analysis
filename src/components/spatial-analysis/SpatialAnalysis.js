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
import { format as formatDateFn } from 'date-fns';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // Debug: Log received props
  console.log('[Debug] SpatialAnalysis Props:', { selectedCommodity, windowWidth });

  const [activeTab, setActiveTab] = useState(1);
  const { geoData, flowMaps, analysisResults, loading, error, uniqueMonths } = useSpatialData();

  // Debug: Log data fetched from useSpatialData hook
  useEffect(() => {
    console.log('[Debug] Data fetched from useSpatialData:', { geoData, flowMaps, analysisResults, loading, error, uniqueMonths });
  }, [geoData, flowMaps, analysisResults, loading, error, uniqueMonths]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Ensure uniqueMonths is sorted in ascending order
  const sortedUniqueMonths = useMemo(() => {
    return [...uniqueMonths].sort((a, b) => a - b);
  }, [uniqueMonths]);

  // Set selectedDate and selectedMonthIndex to the latest date in uniqueMonths when the component mounts or uniqueMonths changes
  useEffect(() => {
    if (sortedUniqueMonths.length > 0) {
      const latestDate = sortedUniqueMonths[sortedUniqueMonths.length - 1];
      setSelectedDate(latestDate);
      setSelectedMonthIndex(sortedUniqueMonths.length - 1);
      console.log(`[Debug] Initialized selectedMonthIndex to ${sortedUniqueMonths.length - 1} (${latestDate})`);
    }
  }, [sortedUniqueMonths]);

  // Helper function to format Date object to "YYYY-MM-DD"
  const formatDate = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('[Warning] Invalid date provided to formatDate:', date);
      return 'Invalid Date';
    }
    return formatDateFn(date, 'yyyy-MM-dd');
  }, []);

  // Find the latest month with data for the selected commodity
  useEffect(() => {
    if (sortedUniqueMonths.length > 0 && geoData) {
      let found = false;
      for (let i = sortedUniqueMonths.length - 1; i >= 0; i--) {
        const month = sortedUniqueMonths[i];
        const formattedDate = formatDate(month);
        const hasData = geoData.features.some(feature => 
          feature.properties.commodity && 
          feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          feature.properties.date === formattedDate
        );
        if (hasData) {
          if (selectedMonthIndex !== i) {
            setSelectedMonthIndex(i);
            setSelectedDate(month);
            console.log(`[Debug] setSelectedMonthIndex to ${i} (${sortedUniqueMonths[i]})`);
          }
          found = true;
          break;
        }
      }
      if (!found && selectedMonthIndex !== null) {
        setSelectedMonthIndex(null);
        setSelectedDate(null);
        console.warn(`[Warning] No data found for commodity: ${selectedCommodity} in any month.`);
      }
    }
  }, [sortedUniqueMonths, geoData, selectedCommodity, formatDate, selectedMonthIndex]);

  // Filter and prepare GeoJSON data for the selected date
  const filteredGeoData = useMemo(() => {
    if (!geoData) {
      console.warn('[Warning] geoData is undefined or null.');
      return null;
    }
    if (sortedUniqueMonths.length === 0) {
      console.warn('[Warning] uniqueMonths is empty.');
      return null;
    }
    if (selectedMonthIndex === null) {
      console.warn('[Warning] No valid month selected for filtering.');
      return null;
    }

    const selectedDateObj = sortedUniqueMonths[selectedMonthIndex];
    const formattedSelectedDate = formatDate(selectedDateObj);
    if (formattedSelectedDate === 'Invalid Date') {
      console.warn('[Warning] Selected date is invalid after formatting.');
      return null;
    }

    // Filter features matching the selected date and commodity
    const filteredFeatures = geoData.features.filter((feature) => {
      const featureDate = feature.properties.date;
      const commodity = feature.properties.commodity;
      return featureDate === formattedSelectedDate && 
        commodity && 
        commodity.toLowerCase() === selectedCommodity.toLowerCase();
    });

    return {
      ...geoData,
      features: filteredFeatures,
    };
  }, [geoData, selectedMonthIndex, sortedUniqueMonths, formatDate, selectedCommodity]);

  // Find the current analysis data for the selectedCommodity
  const currentAnalysis = useMemo(() => {
    return analysisResults?.find((r) => r.commodity.toLowerCase() === selectedCommodity.toLowerCase());
  }, [analysisResults, selectedCommodity]);

  // Handle CSV download
  const handleDownloadCsv = useCallback(() => {
    if (!currentAnalysis) {
      console.warn('No spatial analysis data available to download.');
      return;
    }
    const csv = jsonToCsv([currentAnalysis]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_Spatial_Analysis.csv`);
  }, [currentAnalysis, selectedCommodity]);

  // Handle tab changes
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // Handle date changes from TimeSlider
  const handleDateChange = useCallback((newDate) => {
    const newIndex = sortedUniqueMonths.findIndex(month => month.getTime() === newDate.getTime());
    if (newIndex !== -1) {
      if (selectedMonthIndex !== newIndex) {
        setSelectedMonthIndex(newIndex);
        console.log(`[Debug] setSelectedMonthIndex to ${newIndex} (${sortedUniqueMonths[newIndex]})`);
      }
      setSelectedDate(newDate);
    }
  }, [sortedUniqueMonths, selectedMonthIndex]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" mt={4}>
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}>
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
          No spatial data available for <strong>{selectedCommodity}</strong> on the selected date.
        </Typography>
      </Box>
    );
  }

  if (sortedUniqueMonths.length === 0) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No monthly data available for the selected commodity.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4, p: { xs: 1, sm: 2 }, width: '100%', backgroundColor: theme.palette.background.paper }}>
      {/* Header Section */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          gutterBottom
          sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontSize: isMobile ? '1.5rem' : '2rem' }}
        >
          Spatial Analysis for {selectedCommodity}
          <MuiTooltip title="Spatial Analysis examines the geographical distribution and relationships related to the selected commodity.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </MuiTooltip>
        </Typography>

        {/* Download Button */}
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
            size="medium"
            sx={{ minWidth: '140px', height: '36px', fontSize: '0.9rem', padding: '6px 16px' }}
          >
            Download CSV
          </Button>
        </Box>
      </Box>

      {/* Tabs for Different Analyses */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Spatial Analysis Tabs"
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{ mt: 2, flexWrap: 'nowrap', '& .MuiTabs-flexContainer': { justifyContent: 'center' } }}
        TabIndicatorProps={{ style: { backgroundColor: theme.palette.primary.main } }}
      >
        <Tab label="Animated Flow Map" sx={{ minWidth: isMobile ? 'auto' : 150, fontSize: isMobile ? '0.8rem' : '1rem', textTransform: 'none' }} />
        <Tab label="Choropleth Map" sx={{ minWidth: isMobile ? 'auto' : 150, fontSize: isMobile ? '0.8rem' : '1rem', textTransform: 'none' }} />
        <Tab label="Network Graph" sx={{ minWidth: isMobile ? 'auto' : 150, fontSize: isMobile ? '0.8rem' : '1rem', textTransform: 'none' }} />
        <Tab label="Diagnostics" sx={{ minWidth: isMobile ? 'auto' : 150, fontSize: isMobile ? '0.8rem' : '1rem', textTransform: 'none' }} />
        <Tab label="Regression Results" sx={{ minWidth: isMobile ? 'auto' : 150, fontSize: isMobile ? '0.8rem' : '1rem', textTransform: 'none' }} />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && flowMaps && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Rendering Animated Flow Map...
            </Typography>
            <AnimatedFlowMap flowMaps={flowMaps} selectedCommodity={selectedCommodity} />
          </>
        )}
        {activeTab === 1 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Rendering Choropleth Map...
            </Typography>
            <ChoroplethMap 
              selectedCommodity={selectedCommodity}
              enhancedData={filteredGeoData}
              selectedDate={selectedDate}
              selectedMonthIndex={selectedMonthIndex} // Pass the selectedMonthIndex
              onDateChange={handleDateChange}
              uniqueMonths={sortedUniqueMonths} // Use the sorted array
            />
          </>
        )}
        {activeTab === 2 && flowMaps && filteredGeoData && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Rendering Spatial Network Graph...
            </Typography>
            <SpatialNetworkGraph
              selectedCommodity={selectedCommodity}
              flowMaps={flowMaps}
              geoData={filteredGeoData}
            />
          </>
        )}
        {activeTab === 3 && currentAnalysis ? (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Rendering Diagnostics Tests...
            </Typography>
            <DiagnosticsTests data={currentAnalysis} />
          </>
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No diagnostics data available for the selected commodity.
          </Typography>
        )}
        {activeTab === 4 && currentAnalysis ? (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Rendering Regression Results...
            </Typography>
            <RegressionResults data={currentAnalysis} />
          </>
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No regression results available for the selected commodity.
          </Typography>
        )}
      </Box>

      {/* Interpretation Guide Accordion */}
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