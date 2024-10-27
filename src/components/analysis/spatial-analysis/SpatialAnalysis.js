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
import useSpatialData from '../../../hooks/useSpatialData';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import { saveAs } from 'file-saver';
import LZString from 'lz-string'; 

// Lazy load visualization components with prefetch
const ChoroplethMap = React.lazy(() => {
  const promise = import('./ChoroplethMap.js');
  promise.then(() => {
    // Prefetch related data after component loads
    import('./TimeSlider.js');
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
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  
  // Destructure loadMoreData and hasMore from useSpatialData
  const {
    geoData,
    flowMaps,
    analysisResults,
    loading,
    error,
    uniqueMonths,
    loadMoreData,
    hasMore
  } = useSpatialData();

  const dataCache = useRef(new Map());
  const workerRef = useRef(null);
  const prefetcherRef = useRef(null);

  // Get technical help tooltips
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Data Compression Utilities
  const compressData = useCallback((data) => {
    return LZString.compressToUTF16(JSON.stringify(data));
  }, []);

  const decompressData = useCallback((compressed) => {
    return JSON.parse(LZString.decompressFromUTF16(compressed));
  }, []);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../../workers/dataProcessor.worker.js', import.meta.url)
    );

    return () => workerRef.current?.terminate();
  }, []);

  // Cached data getter with compression handling
  const getCachedData = useCallback((key, data) => {
    if (!dataCache.current.has(key)) {
      const compressed = compressData(data);
      dataCache.current.set(key, compressed);
    }
    const compressedData = dataCache.current.get(key);
    return decompressData(compressedData);
  }, [compressData, decompressData]);

  // Set initial date when data is loaded
  useEffect(() => {
    if (uniqueMonths.length > 0 && !selectedDate) {
      const latestMonth = uniqueMonths[uniqueMonths.length - 1];
      if (latestMonth instanceof Date && !isNaN(latestMonth)) {
        setSelectedDate(latestMonth);
        setSelectedMonthIndex(uniqueMonths.length - 1);
      } else {
        console.error('Invalid date found in uniqueMonths:', latestMonth);
      }
    }
  }, [uniqueMonths, selectedDate]);

  // Handle date changes with useCallback and validation
  const handleDateChange = useCallback((newDate) => {
    if (!(newDate instanceof Date) || isNaN(newDate)) {
      console.error('handleDateChange received an invalid date:', newDate);
      return;
    }
    const index = uniqueMonths.findIndex(date => 
      date.getTime() === newDate.getTime()
    );
    if (index !== -1) {
      setSelectedDate(newDate);
      setSelectedMonthIndex(index);
    } else {
      console.warn('Selected date not found in uniqueMonths:', newDate);
    }
  }, [uniqueMonths]);

  // Optimized tab change handler
  const handleTabChange = useCallback((event, newValue) => {
    if (newValue === 1 && !dataCache.current.has('flowMaps')) {
      getCachedData('flowMaps', flowMaps);
    }
    setActiveTab(newValue);
  }, [flowMaps, getCachedData]);

  // Optimized data download using Web Worker
  const handleDownloadData = useCallback(() => {
    if (!workerRef.current) return;

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

    workerRef.current.onmessage = (event) => {
      const blob = new Blob([event.data], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${selectedCommodity}_spatial_analysis.csv`);
    };

    workerRef.current.postMessage({
      type: 'prepareDownload',
      data: dataToDownload
    });
  }, [selectedCommodity, selectedDate, analysisResults, flowMaps]);

  // Memoized analysis summary with error handling
  const analysisSummary = useMemo(() => {
    if (!analysisResults) return null;

    try {
      const stats = analysisResults.statistics;
      return {
        moranI: stats?.moranI || 0,
        clusters: analysisResults.clusters?.length || 0,
        significantFlows: flowMaps?.filter(f => f.flow_weight > stats?.meanFlowWeight)?.length || 0,
        spatialDependence: stats?.moranI > 0.3 ? 'Strong' : stats?.moranI > 0 ? 'Moderate' : 'Weak'
      };
    } catch (error) {
      console.error('Error calculating analysis summary:', error);
      return null;
    }
  }, [analysisResults, flowMaps]);

  // Progressive Loading: Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMoreData();
        }
      },
      { threshold: 0.5 }
    );

    const target = document.querySelector('#load-more-trigger');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loading, loadMoreData]);

  // Memory Management: Cleanup on unmount
  useEffect(() => {
    const cleanup = () => {
      prefetcherRef.current?.clear();
      dataCache.current.clear();
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  // Loading states
  const isInitializing = !loading && !error && !selectedDate;

  if (loading || isInitializing) {
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
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
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
        {/* Header */}
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
          Spatial Analysis: {selectedCommodity}
          <Tooltip title={getTechnicalTooltip('spatial_analysis')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </Tooltip>
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Suspense fallback={<CircularProgress size={24} />}>
            <SpatialTutorial />
          </Suspense>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadData}
            size="medium"
          >
            Download Data
          </Button>
        </Box>

        {/* Analysis Summary */}
        {analysisSummary && (
          <Alert 
            severity={
              analysisSummary.spatialDependence === 'Strong' ? 'success' :
              analysisSummary.spatialDependence === 'Moderate' ? 'info' :
              'warning'
            }
            sx={{ mb: 3 }}
          >
            <AlertTitle>Analysis Summary</AlertTitle>
            <Typography variant="body2">
              Spatial analysis indicates {analysisSummary.spatialDependence.toLowerCase()} spatial dependence 
              (Moran&apos;s I: {analysisSummary.moranI.toFixed(3)}) for {selectedCommodity} prices. 
              Identified {analysisSummary.clusters} distinct market clusters with {analysisSummary.significantFlows} significant 
              trade flows.
            </Typography>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Tab label="Choropleth Map" />
          <Tab label="Flow Network" />
          <Tab label="Statistics" />
          <Tab label="Market Clusters" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 0 && geoData && (
              <ChoroplethMap
                selectedCommodity={selectedCommodity}
                enhancedData={getCachedData('geoData', geoData)}
                selectedDate={selectedDate}
                selectedMonthIndex={selectedMonthIndex}
                onDateChange={handleDateChange}
                uniqueMonths={uniqueMonths}
                isMobile={isMobile}
              />
            )}

            {activeTab === 1 && flowMaps && (
              <CombinedFlowNetworkMap
                flowMaps={getCachedData('flowMaps', flowMaps)}
                selectedCommodity={selectedCommodity}
                dateRange={[uniqueMonths[0], uniqueMonths[uniqueMonths.length - 1]]}
              />
            )}

            {activeTab === 2 && analysisResults && analysisResults.statistics && (
              <SpatialStatistics
                analysisResults={getCachedData('analysisResults', analysisResults)}
              />
            )}

            {activeTab === 3 && analysisResults && (
              <MarketClustering
                clusters={getCachedData('clusters', analysisResults.clusters)}
                selectedCommodity={selectedCommodity}
                isMobile={isMobile}
              />
            )}
          </Suspense>
        </Box>

        {/* Trigger Element for Infinite Scrolling */}
        {hasMore && (
          <Box id="load-more-trigger" sx={{ height: 20, my: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {/* Methodology Guide */}
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Methodology Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>
              The spatial analysis examines geographical patterns and relationships in market data through:
            </Typography>
            <ul>
              <li>
                <Typography variant="body1">
                  <strong>Choropleth Maps:</strong> Visualize spatial distribution of prices and conflict intensity
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Flow Network Analysis:</strong> Examine market relationships and trade flows
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Spatial Statistics:</strong> Quantify spatial patterns using Moran&apos;s I and other metrics
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Market Clustering:</strong> Identify groups of markets with similar characteristics
                </Typography>
              </li>
            </ul>
            <Typography variant="body1" paragraph>
              This analysis helps identify spatial patterns in market integration, price transmission, 
              and the impact of conflict on market relationships.
            </Typography>
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