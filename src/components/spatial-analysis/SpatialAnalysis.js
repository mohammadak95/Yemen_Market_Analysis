// src/components/spatial-analysis/SpatialAnalysis.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import CombinedFlowNetworkMap from './CombinedFlowNetworkMap';
import ChoroplethMap from './ChoroplethMap';
import DiagnosticsTests from './DiagnosticsTests';
import RegressionResults from './RegressionResults';
import useSpatialData from '../../hooks/useSpatialData';
import ErrorMessage from '../common/ErrorMessage';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../utils/jsonToCsv';
import { useTheme } from '@mui/material/styles';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  console.debug('SpatialAnalysis component initialized', { selectedCommodity, windowWidth });

  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  console.debug('Theme and responsive settings', { theme, isMobile });

  const [activeTab, setActiveTab] = useState(0);
  console.debug('Initial activeTab state', { activeTab });

  // Destructure networkData from useSpatialData
  const {
    geoData,
    flowMaps,
    networkData,
    analysisResults,
    loading,
    error,
    uniqueMonths,
  } = useSpatialData();
  console.debug('useSpatialData hook output', {
    geoData,
    flowMaps,
    networkData,
    analysisResults,
    loading,
    error,
    uniqueMonths,
  });

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  console.debug('Initial selectedMonthIndex and selectedDate state', {
    selectedMonthIndex,
    selectedDate,
  });

  const [isCombinedMapLoading, setIsCombinedMapLoading] = useState(true);
  const [isChoroplethLoading, setIsChoroplethLoading] = useState(true);
  const [isDiagnosticsLoading, setIsDiagnosticsLoading] = useState(true);
  const [isRegressionLoading, setIsRegressionLoading] = useState(true);
  console.debug('Initial loading states', {
    isCombinedMapLoading,
    isChoroplethLoading,
    isDiagnosticsLoading,
    isRegressionLoading,
  });

  console.log('SpatialAnalysis render', {
    selectedCommodity,
    windowWidth,
    activeTab,
    loading,
    error,
  });

  const formatDate = useCallback((date) => {
    console.debug('formatDate called with', { date });
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('[Warning] Invalid date provided to formatDate:', date);
      return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const formatted = `${year}-${month}`;
    console.debug('formatDate result', { formatted });
    return formatted;
  }, []);

  const sortedUniqueMonths = useMemo(() => {
    console.debug('Sorting uniqueMonths', { uniqueMonths });
    const sorted = [...uniqueMonths].sort((a, b) => a - b);
    console.debug('sortedUniqueMonths', { sorted });
    return sorted;
  }, [uniqueMonths]);

  useEffect(() => {
    console.log('SpatialAnalysis useEffect - setting initial date');
    if (sortedUniqueMonths.length > 0 && geoData && !loading) {
      console.debug('Conditions met for setting initial date', {
        sortedUniqueMonths,
        geoData,
        loading,
      });
      let latestValidDate = null;
      let latestValidIndex = -1;

      for (let i = sortedUniqueMonths.length - 1; i >= 0; i--) {
        const month = sortedUniqueMonths[i];
        console.debug('Checking month', { month, index: i });
        const formattedDate = formatDate(month);
        console.debug('Formatted date for comparison', { formattedDate });

        const matchingFeatures = geoData.features.filter((feature) => {
          const featureDateObj = new Date(feature.properties.date);
          const featureYear = featureDateObj.getFullYear();
          const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
          const featureFormattedDate = `${featureYear}-${featureMonth}`;
          const match =
            feature.properties.commodity &&
            feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
            featureFormattedDate === formattedDate;
          if (match) {
            console.debug('Feature matches criteria', {
              featureId: feature.id,
              featureFormattedDate,
              selectedCommodity,
            });
          }
          return match;
        });

        console.debug('Number of matching features found', { count: matchingFeatures.length });

        if (matchingFeatures.length > 0) {
          latestValidDate = month;
          latestValidIndex = i;
          console.debug('Latest valid date and index found', {
            latestValidDate,
            latestValidIndex,
          });
          break;
        }
      }

      if (latestValidDate) {
        setSelectedMonthIndex(latestValidIndex);
        setSelectedDate(latestValidDate);
        console.debug('State updated with latest valid date and index', {
          latestValidDate,
          latestValidIndex,
        });
      } else {
        console.warn(`No valid data found for ${selectedCommodity.toLowerCase()} in any month.`);
        setSelectedMonthIndex(null);
        setSelectedDate(null);
      }
    } else {
      console.debug('Conditions not met for setting initial date', {
        sortedUniqueMonthsLength: sortedUniqueMonths.length,
        geoDataExists: !!geoData,
        loading,
      });
    }
  }, [sortedUniqueMonths, geoData, selectedCommodity, formatDate, loading]);

  const filteredGeoData = useMemo(() => {
    console.log('Filtering geoData');
    if (!geoData || !selectedDate) {
      console.warn('[Warning] geoData or selectedDate is null/undefined', {
        geoDataExists: !!geoData,
        selectedDate,
      });
      return null;
    }

    const formattedSelectedDate = formatDate(selectedDate);
    console.debug('Formatted selectedDate for filtering', { formattedSelectedDate });

    const filteredFeatures = geoData.features.filter((feature) => {
      const featureDateObj = new Date(feature.properties.date);
      const featureYear = featureDateObj.getFullYear();
      const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
      const featureFormattedDate = `${featureYear}-${featureMonth}`;
      const match =
        featureFormattedDate === formattedSelectedDate &&
        feature.properties.commodity &&
        feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase();

      if (match) {
        console.debug('Feature matches filter criteria', {
          featureId: feature.id,
          featureFormattedDate,
          selectedCommodity,
        });
      }

      return match;
    });

    console.log(
      `Filtered ${filteredFeatures.length} features for ${selectedCommodity} on ${formattedSelectedDate}`,
      { filteredFeatures }
    );

    return {
      ...geoData,
      features: filteredFeatures,
    };
  }, [geoData, selectedDate, formatDate, selectedCommodity]);

  const currentAnalysis = useMemo(() => {
    console.log('Selecting current analysis');
    if (!analysisResults || !selectedCommodity) {
      console.debug('Either analysisResults or selectedCommodity is missing', {
        analysisResultsExists: !!analysisResults,
        selectedCommodity,
      });
      return null;
    }
    const analysis = analysisResults.find(
      (r) => r.commodity.toLowerCase() === selectedCommodity.toLowerCase()
    );
    console.debug('Current analysis selected', { analysis });
    return analysis;
  }, [analysisResults, selectedCommodity]);

  useEffect(() => {
    console.log('SpatialAnalysis useEffect - setting loading states');
    console.debug('flowMaps and networkData presence', {
      flowMapsExists: !!flowMaps,
      networkDataExists: !!networkData,
    });
    setIsCombinedMapLoading(!flowMaps || !networkData);
    console.debug('isCombinedMapLoading set to', {
      isCombinedMapLoading: !flowMaps || !networkData,
    });

    console.debug('filteredGeoData presence', {
      filteredGeoDataExists: !!filteredGeoData,
    });
    setIsChoroplethLoading(!filteredGeoData);
    console.debug('isChoroplethLoading set to', {
      isChoroplethLoading: !filteredGeoData,
    });

    console.debug('currentAnalysis presence', {
      currentAnalysisExists: !!currentAnalysis,
    });
    setIsDiagnosticsLoading(!currentAnalysis);
    setIsRegressionLoading(!currentAnalysis);
    console.debug('isDiagnosticsLoading set to', {
      isDiagnosticsLoading: !currentAnalysis,
    });
    console.debug('isRegressionLoading set to', {
      isRegressionLoading: !currentAnalysis,
    });
  }, [flowMaps, networkData, filteredGeoData, currentAnalysis]);

  const handleDownloadCsv = useCallback(() => {
    console.log('Downloading CSV');
    if (!currentAnalysis) {
      console.warn('No spatial analysis data available to download.');
      return;
    }
    console.debug('Converting analysis data to CSV', { currentAnalysis });
    const csv = jsonToCsv([currentAnalysis]);
    console.debug('CSV content generated', { csv });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_Spatial_Analysis.csv`);
    console.log('CSV download initiated', {
      filename: `${selectedCommodity}_Spatial_Analysis.csv`,
    });
  }, [currentAnalysis, selectedCommodity]);

  const handleTabChange = useCallback((event, newValue) => {
    console.log('Tab changed', { newValue });
    setActiveTab(newValue);
    console.debug('Active tab state updated', { activeTab: newValue });
  }, []);

  const handleDateChange = useCallback(
    (newDate) => {
      console.log('Date changed', { newDate });
      const newIndex = sortedUniqueMonths.findIndex(
        (month) => month.getTime() === newDate.getTime()
      );
      console.debug('Found newIndex for selected date', { newIndex });
      if (newIndex !== -1) {
        const formattedNewDate = formatDate(newDate);
        console.debug('Formatted new date', { formattedNewDate });
        const hasData = geoData.features.some((feature) => {
          const featureDateObj = new Date(feature.properties.date);
          const featureYear = featureDateObj.getFullYear();
          const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
          const featureFormattedDate = `${featureYear}-${featureMonth}`;
          const match =
            feature.properties.commodity &&
            feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
            featureFormattedDate === formattedNewDate;
          if (match) {
            console.debug('Feature has data for new date', {
              featureId: feature.id,
              featureFormattedDate,
            });
          }
          return match;
        });
        console.debug('Has data for new date', { hasData });
        if (hasData) {
          setSelectedMonthIndex(newIndex);
          setSelectedDate(newDate);
          console.debug('State updated with new date and index', {
            newIndex,
            newDate,
          });
        } else {
          console.warn(
            `No data available for ${selectedCommodity.toLowerCase()} on ${formattedNewDate}`
          );
        }
      } else {
        console.warn('Selected date not found in sortedUniqueMonths', { newDate });
      }
    },
    [sortedUniqueMonths, geoData, selectedCommodity, formatDate]
  );

  if (loading) {
    console.debug('Rendering loading state');
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
    console.debug('Rendering error state', { error });
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <ErrorMessage message={`Error loading spatial data: ${error}`} />
      </Box>
    );
  }

  if (!filteredGeoData || filteredGeoData.features.length === 0) {
    console.debug('Rendering no data available state', {
      filteredGeoDataExists: !!filteredGeoData,
      featureCount: filteredGeoData ? filteredGeoData.features.length : 0,
    });
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No spatial data available for <strong>{selectedCommodity}</strong> on the
          selected date ({selectedDate ? formatDate(selectedDate) : 'No date selected'}).
          Please try selecting a different commodity or date range.
        </Typography>
      </Box>
    );
  }

  console.debug('Rendering main content of SpatialAnalysis');

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
          '& .MuiTabs-flexContainer': { justifyContent: 'center' },
        }}
        TabIndicatorProps={{ style: { backgroundColor: theme.palette.primary.main } }}
      >
        <Tab
          label="Combined Flow and Network Map"
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
        {activeTab === 0 && (
          isCombinedMapLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Combined Flow and Network Map...
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Combined Flow and Network Map
              </Typography>
              <CombinedFlowNetworkMap
                flowMaps={flowMaps}
                networkData={networkData} // Ensure networkData is passed
                selectedCommodity={selectedCommodity}
                dateRange={[
                  sortedUniqueMonths[0],
                  sortedUniqueMonths[sortedUniqueMonths.length - 1],
                ]}
              />
            </>
          )
        )}
        {/* Similar handling for other tabs */}
        {activeTab === 1 && (
          isChoroplethLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Choropleth Map...
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Choropleth Map
              </Typography>
              <ChoroplethMap
                selectedCommodity={selectedCommodity}
                enhancedData={filteredGeoData}
                selectedDate={selectedDate}
                selectedMonthIndex={selectedMonthIndex}
                onDateChange={handleDateChange}
                uniqueMonths={sortedUniqueMonths}
              />
            </>
          )
        )}
        {activeTab === 2 && (
          isDiagnosticsLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Diagnostics Tests...
            </Typography>
          ) : currentAnalysis ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Diagnostics Tests
              </Typography>
              <DiagnosticsTests data={currentAnalysis} />
            </>
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No diagnostics data available for the selected commodity.
            </Typography>
          )
        )}
        {activeTab === 3 && (
          isRegressionLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Regression Results...
            </Typography>
          ) : currentAnalysis ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Regression Results
              </Typography>
              <RegressionResults data={currentAnalysis} />
            </>
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No regression results available for the selected commodity.
            </Typography>
          )
        )}
      </Box>

      {/* Interpretation Guide Accordion */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* ...Interpretation guide content... */}
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
