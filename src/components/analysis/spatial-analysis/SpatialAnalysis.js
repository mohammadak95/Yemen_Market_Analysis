// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { 
  Info as InfoIcon, 
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useSpatialDataOptimized from '../../../hooks/useSpatialDataOptimized';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import { saveAs } from 'file-saver';
import LZString from 'lz-string';

// Lazy load visualization components with prefetch
const ChoroplethMap = React.lazy(() => {
  const promise = import('./ChoroplethMap.js');
  promise.then(() => {
    import('./TimeSlider.js');
    console.log('ChoroplethMap and TimeSlider components have been prefetched.');
  }).catch(error => {
    console.error('Error prefetching TimeSlider component:', error);
  });
  return promise;
});

const CombinedFlowNetworkMap = React.lazy(() => import('./CombinedFlowNetworkMap.js'));
const SpatialStatistics = React.lazy(() => import('./SpatialStatistics.js'));
const MarketClustering = React.lazy(() => import('./MarketClustering.js'));
const SpatialTutorial = React.lazy(() => import('./SpatialTutorial.js'));

// Custom loading component with better UX
const LoadingFallback = () => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={200}>
    <CircularProgress size={40} />
    <Typography variant="body2" sx={{ mt: 2 }}>Loading visualization...</Typography>
  </Box>
);

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  console.log('SpatialAnalysis component initialized with selectedCommodity:', selectedCommodity, 'and windowWidth:', windowWidth);

  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  
  // Use enhanced data structure from our fixed hook
  const {
    geoData,
    flowMaps,
    analysisResults,
    loading,
    error,
    uniqueMonths,
    spatialWeights // Now properly handled from the hook
  } = useSpatialDataOptimized(selectedCommodity); // Pass selectedCommodity

  console.log('useSpatialDataOptimized returned:', {
    geoData,
    flowMaps,
    analysisResults,
    spatialWeights,
    loading,
    error,
    uniqueMonths,
  });

  const workerRef = useRef(null);

  const { getTechnicalTooltip } = useTechnicalHelp('spatial');
  console.log('Retrieved technical tooltips.');

  useEffect(() => {
    console.log('Initializing Web Worker for data processing.');
    try {
      workerRef.current = new Worker(
        new URL('../../../workers/dataProcessor.worker.js', import.meta.url)
      );
      console.log('Web Worker initialized successfully.');
    } catch (workerError) {
      console.error('Error initializing Web Worker:', workerError);
    }

    return () => {
      if (workerRef.current) {
        console.log('Terminating Web Worker.');
        workerRef.current.terminate();
      }
    };
  }, []);

  const compressData = useCallback((data) => {
    try {
      const compressed = LZString.compressToUTF16(JSON.stringify(data));
      console.log('Data compressed successfully.');
      return compressed;
    } catch (compressionError) {
      console.error('Error compressing data:', compressionError);
      return null;
    }
  }, []);

  const decompressData = useCallback((compressed) => {
    try {
      const decompressed = JSON.parse(LZString.decompressFromUTF16(compressed));
      console.log('Data decompressed successfully.');
      return decompressed;
    } catch (decompressionError) {
      console.error('Error decompressing data:', decompressionError);
      return null;
    }
  }, []);

  const getCachedData = useCallback((key, data) => {
    console.log(`Fetching cached data for key: ${key}`);
    // Since caching is handled by Redux and useSpatialDataOptimized, this can be simplified or removed
    return data;
  }, []);

  useEffect(() => {
    console.log('Setting initial date from uniqueMonths if available.');
    if (uniqueMonths.length > 0 && !selectedDate) {
      const latestMonth = uniqueMonths[uniqueMonths.length - 1];
      console.log('Latest month available:', latestMonth);
      if (latestMonth instanceof Date && !isNaN(latestMonth)) {
        setSelectedDate(latestMonth);
        setSelectedMonthIndex(uniqueMonths.length - 1);
        console.log('Initial date set to:', latestMonth, 'with index:', uniqueMonths.length - 1);
      } else {
        console.error('Invalid date found in uniqueMonths:', latestMonth);
      }
    }
  }, [uniqueMonths, selectedDate]);

  const handleDateChange = useCallback((newDate) => {
    console.log('handleDateChange called with:', {
      newDate,
      dateType: typeof newDate,
      isDateObject: newDate instanceof Date,
      timestamp: newDate instanceof Date ? newDate.getTime() : null
    });
    console.log('handleDateChange called with newDate:', newDate);
    if (!(newDate instanceof Date) || isNaN(newDate)) {
      console.error('handleDateChange received an invalid date:', newDate);
      return;
    }
    const index = uniqueMonths.findIndex(date => date.getTime() === newDate.getTime());
    if (index !== -1) {
      setSelectedDate(newDate);
      setSelectedMonthIndex(index);
      console.log('Date changed to:', newDate, 'at index:', index);
    } else {
      console.warn('Selected date not found in uniqueMonths:', newDate);
    }
  }, [uniqueMonths]);

  const handleTabChange = useCallback((event, newValue) => {
    console.log('Tab changed from', activeTab, 'to', newValue);
    setActiveTab(newValue);
  }, [activeTab]);

  const handleDownloadData = useCallback(() => {
    console.log('handleDownloadData initiated.');
    if (!workerRef.current) {
      console.error('Web Worker is not initialized.');
      return;
    }

    const dataToDownload = {
      metadata: {
        commodity: selectedCommodity,
        date: selectedDate?.toISOString(),
        type: 'spatial_analysis'
      },
      statistics: analysisResults?.statistics || {},
      clusters: analysisResults?.clusters || [],
      flows: flowMaps || [],
      spatialPatterns: analysisResults?.spatialPatterns || {}
    };

    console.log('Data prepared for download:', dataToDownload);

    workerRef.current.onmessage = (event) => {
      console.log('Web Worker message received for data download.');
      const blob = new Blob([event.data], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${selectedCommodity}_spatial_analysis.csv`);
      console.log('Data downloaded as CSV:', `${selectedCommodity}_spatial_analysis.csv`);
    };

    workerRef.current.onerror = (workerError) => {
      console.error('Error in Web Worker during data download:', workerError);
    };

    workerRef.current.postMessage({
      type: 'prepareDownload',
      data: dataToDownload
    });
    console.log('Data sent to Web Worker for processing.');
  }, [selectedCommodity, selectedDate, analysisResults, flowMaps]);

  // Enhanced analysis summary with better null checks
  const analysisSummary = useMemo(() => {
    console.log('Calculating analysis summary.');
    if (!analysisResults?.statistics) {
      console.warn('No analysisResults available for summary.');
      return null;
    }

    try {
      const stats = analysisResults.statistics;
      const summary = {
        moranI: stats?.moranI || 0,
        clusters: analysisResults.clusters?.length || 0,
        significantFlows: flowMaps?.filter(f => {
          // Enhanced flow filtering with proper null checks
          if (!stats?.meanFlowWeight || !f?.flow_weight) return false;
          return f.flow_weight > stats.meanFlowWeight;
        })?.length || 0,
        spatialDependence: stats?.moranI > 0.3 ? 'Strong' : stats?.moranI > 0 ? 'Moderate' : 'Weak'
      };
      console.log('Analysis Summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error calculating analysis summary:', error);
      return null;
    }
  }, [analysisResults, flowMaps]);

  // Enhanced loading check
  const isInitializing = !loading && !error && (!selectedDate || !geoData);
  console.log('isInitializing:', isInitializing);

  // Enhanced error handling for missing data
  if (!selectedCommodity) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>Missing Selection</AlertTitle>
        Please select a commodity to analyze.
      </Alert>
    );
  }

  if (loading || isInitializing) {
    console.log('Rendering loading state.');
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" mt={4}>
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}>
          Loading Spatial Analysis results for {selectedCommodity}...
        </Typography>
      </Box>
    );
  }

  // Enhanced error handling with more context
  if (error) {
    console.error('Rendering error state with message:', error);
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error Loading Spatial Data</AlertTitle>
        <Typography>{error}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          This might be due to missing or invalid data files. Please try again or contact support if the issue persists.
        </Typography>
      </Alert>
    );
  }

  // Ensure required data is available before rendering components
  const canRenderChoropleth = geoData && selectedDate && uniqueMonths.length > 0;
  const canRenderFlowNetwork = flowMaps && flowMaps.length > 0 && uniqueMonths.length > 0;
  const canRenderStatistics = analysisResults?.statistics;
  const canRenderClustering = analysisResults?.clusters;

  return (
    <Paper elevation={3} sx={{ mt: 4, p: { xs: 1, sm: 2 }, width: '100%', backgroundColor: theme.palette.background.paper }}>
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom sx={{
          fontWeight: 'bold', display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Spatial Analysis: {selectedCommodity}
          <Tooltip title={getTechnicalTooltip('spatial_analysis')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </Tooltip>
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Suspense fallback={<CircularProgress size={24} />}>
            <SpatialTutorial />
            {console.log('SpatialTutorial component is being rendered.')}
          </Suspense>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownloadData} size="medium">
            Download Data
          </Button>
        </Box>

        {/* Enhanced Analysis Summary with better null checks */}
        {analysisSummary && (
          <Alert 
            severity={analysisSummary.spatialDependence === 'Strong' ? 'success' : 
                     analysisSummary.spatialDependence === 'Moderate' ? 'info' : 'warning'} 
            sx={{ mb: 3 }}
          >
            <AlertTitle>Analysis Summary</AlertTitle>
            <Typography variant="body2">
              Spatial analysis indicates {analysisSummary.spatialDependence.toLowerCase()} spatial dependence 
              (Moran&apos;s I: {analysisSummary.moranI.toFixed(3)}) for {selectedCommodity} prices. 
              {analysisSummary.clusters > 0 && (
                ` Identified ${analysisSummary.clusters} distinct market clusters`
              )}
              {analysisSummary.significantFlows > 0 && (
                ` with ${analysisSummary.significantFlows} significant trade flows`
              )}.
            </Typography>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Choropleth Map" />
          <Tab label="Flow Network" />
          <Tab label="Statistics" />
          <Tab label="Market Clusters" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 0 && canRenderChoropleth && (
              <ChoroplethMap 
                selectedCommodity={selectedCommodity}
                enhancedData={geoData}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                uniqueMonths={uniqueMonths}
                isMobile={isMobile}
              />
            )}
            {activeTab === 1 && canRenderFlowNetwork && (
              <CombinedFlowNetworkMap 
                flowMaps={flowMaps}
                selectedCommodity={selectedCommodity}
                dateRange={[uniqueMonths[0], uniqueMonths[uniqueMonths.length - 1]]}
              />
            )}
            {activeTab === 2 && canRenderStatistics && (
              <SpatialStatistics 
                analysisResults={analysisResults.statistics}
              />
            )}
            {activeTab === 3 && canRenderClustering && (
              <MarketClustering 
                clusters={analysisResults.clusters}
                selectedCommodity={selectedCommodity}
                isMobile={isMobile}
              />
            )}
          </Suspense>
        </Box>

        {/* Methodology Guide */}
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Methodology Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>The spatial analysis examines geographical patterns and relationships in market data through:</Typography>
            <ul>
              <li><Typography variant="body1"><strong>Choropleth Maps:</strong> Visualize spatial distribution of prices and conflict intensity</Typography></li>
              <li><Typography variant="body1"><strong>Flow Network Analysis:</strong> Examine market relationships and trade flows</Typography></li>
              <li><Typography variant="body1"><strong>Spatial Statistics:</strong> Quantify spatial patterns using Moran&apos;s I and other metrics</Typography></li>
              <li><Typography variant="body1"><strong>Market Clustering:</strong> Identify groups of markets with similar characteristics</Typography></li>
            </ul>
            <Typography variant="body1" paragraph>This analysis helps identify spatial patterns in market integration, price transmission, and the impact of conflict on market relationships.</Typography>
            {console.log('Methodology Guide rendered.')}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(SpatialAnalysis);
