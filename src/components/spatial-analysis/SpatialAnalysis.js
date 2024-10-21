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

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [activeTab, setActiveTab] = useState(1);
  const { geoData, flowMaps, analysisResults, loading, error, uniqueMonths } = useSpatialData();

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [isFlowMapLoading, setIsFlowMapLoading] = useState(true);
  const [isChoroplethLoading, setIsChoroplethLoading] = useState(true);
  const [isNetworkGraphLoading, setIsNetworkGraphLoading] = useState(true);
  const [isDiagnosticsLoading, setIsDiagnosticsLoading] = useState(true);
  const [isRegressionLoading, setIsRegressionLoading] = useState(true);

  const formatDate = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('[Warning] Invalid date provided to formatDate:', date);
      return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const sortedUniqueMonths = useMemo(() => {
    return [...uniqueMonths].sort((a, b) => a - b);
  }, [uniqueMonths]);

  useEffect(() => {
    if (sortedUniqueMonths.length > 0 && geoData && !loading) {
      let latestValidDate = null;
      let latestValidIndex = -1;

      for (let i = sortedUniqueMonths.length - 1; i >= 0; i--) {
        const month = sortedUniqueMonths[i];
        const formattedDate = formatDate(month);

        const matchingFeatures = geoData.features.filter(feature => {
          const featureDateObj = new Date(feature.properties.date);
          const featureYear = featureDateObj.getFullYear();
          const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
          const featureFormattedDate = `${featureYear}-${featureMonth}`;
          return (
            feature.properties.commodity &&
            feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
            featureFormattedDate === formattedDate
          );
        });

        if (matchingFeatures.length > 0) {
          latestValidDate = month;
          latestValidIndex = i;
          break;
        }
      }

      if (latestValidDate) {
        setSelectedMonthIndex(latestValidIndex);
        setSelectedDate(latestValidDate);
      } else {
        console.warn(`No valid data found for ${selectedCommodity.toLowerCase()} in any month.`);
        setSelectedMonthIndex(null);
        setSelectedDate(null);
      }
    }
  }, [sortedUniqueMonths, geoData, selectedCommodity, formatDate, loading]);

  const filteredGeoData = useMemo(() => {
    if (!geoData || !selectedDate) {
      console.warn('[Warning] geoData or selectedDate is null/undefined');
      return null;
    }

    const formattedSelectedDate = formatDate(selectedDate);

    const filteredFeatures = geoData.features.filter((feature) => {
      const featureDateObj = new Date(feature.properties.date);
      const featureYear = featureDateObj.getFullYear();
      const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
      const featureFormattedDate = `${featureYear}-${featureMonth}`;
      const match = featureFormattedDate === formattedSelectedDate && 
        feature.properties.commodity && 
        feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase();

      return match;
    });

    return {
      ...geoData,
      features: filteredFeatures,
    };
  }, [geoData, selectedDate, formatDate, selectedCommodity]);

  const currentAnalysis = useMemo(() => {
    if (!analysisResults || !selectedCommodity) {
      return null;
    }
    return analysisResults.find(r => r.commodity.toLowerCase() === selectedCommodity.toLowerCase());
  }, [analysisResults, selectedCommodity]);

  useEffect(() => {
    setIsFlowMapLoading(!flowMaps);
    setIsChoroplethLoading(!filteredGeoData);
    setIsNetworkGraphLoading(!flowMaps || !filteredGeoData);
    setIsDiagnosticsLoading(!currentAnalysis);
    setIsRegressionLoading(!currentAnalysis);
  }, [flowMaps, filteredGeoData, currentAnalysis]);

  const handleDownloadCsv = useCallback(() => {
    if (!currentAnalysis) {
      console.warn('No spatial analysis data available to download.');
      return;
    }
    const csv = jsonToCsv([currentAnalysis]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_Spatial_Analysis.csv`);
  }, [currentAnalysis, selectedCommodity]);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const handleDateChange = useCallback((newDate) => {
    const newIndex = sortedUniqueMonths.findIndex(month => month.getTime() === newDate.getTime());
    if (newIndex !== -1) {
      const formattedNewDate = formatDate(newDate);
      const hasData = geoData.features.some(feature => {
        const featureDateObj = new Date(feature.properties.date);
        const featureYear = featureDateObj.getFullYear();
        const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
        const featureFormattedDate = `${featureYear}-${featureMonth}`;
        return (
          feature.properties.commodity && 
          feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          featureFormattedDate === formattedNewDate
        );
      });
      if (hasData) {
        setSelectedMonthIndex(newIndex);
        setSelectedDate(newDate);
      } else {
        console.warn(`No data available for ${selectedCommodity.toLowerCase()} on ${formattedNewDate}`);
      }
    }
  }, [sortedUniqueMonths, geoData, selectedCommodity, formatDate]);

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

  if (!filteredGeoData || filteredGeoData.features.length === 0) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No spatial data available for <strong>{selectedCommodity}</strong> on the selected date ({selectedDate ? formatDate(selectedDate) : 'No date selected'}).
          Please try selecting a different commodity or date range.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4, p: { xs: 1, sm: 2 }, width: '100%', backgroundColor: theme.palette.background.paper }}>
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

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          isFlowMapLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Animated Flow Map...
            </Typography>
          ) : (
            <AnimatedFlowMap flowMaps={flowMaps} selectedCommodity={selectedCommodity} />
          )
        )}
        {activeTab === 1 && (
          isChoroplethLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Choropleth Map...
            </Typography>
          ) : (
            <ChoroplethMap 
              selectedCommodity={selectedCommodity}
              enhancedData={filteredGeoData}
              selectedDate={selectedDate}
              selectedMonthIndex={selectedMonthIndex}
              onDateChange={handleDateChange}
              uniqueMonths={sortedUniqueMonths}
            />
          )
        )}
        {activeTab === 2 && (
          isNetworkGraphLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Spatial Network Graph...
            </Typography>
          ) : (
            <SpatialNetworkGraph
              selectedCommodity={selectedCommodity}
              flowMaps={flowMaps}
              geoData={filteredGeoData}
            />
          )
        )}
        {activeTab === 3 && (
          isDiagnosticsLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Diagnostics Tests...
            </Typography>
          ) : currentAnalysis ? (
            <DiagnosticsTests data={currentAnalysis} />
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No diagnostics data available for the selected commodity.
            </Typography>
          )
        )}
        {activeTab === 4 && (
          isRegressionLoading ? (
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Loading Regression Results...
            </Typography>
          ) : currentAnalysis ? (
            <RegressionResults data={currentAnalysis} />
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No regression results available for the selected commodity.
            </Typography>
          )
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
              <li>The <strong>Animated Flow Map</strong> shows the movement of {selectedCommodity} between regions over time.</li>
              <li>The <strong>Choropleth Map</strong> displays the distribution of {selectedCommodity} prices across different regions.</li>
              <li>The <strong>Network Graph</strong> illustrates the connections and interdependencies between different markets.</li>
              <li>The <strong>Diagnostics</strong> tab provides statistical tests to validate the spatial analysis.</li>
              <li>The <strong>Regression Results</strong> show the relationship between various factors and {selectedCommodity} prices.</li>
            </ul>
            <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
              How to Interpret the Results:
            </Typography>
            <ul>
              <li>Look for patterns in commodity movement in the Animated Flow Map. Strong flows may indicate established trade routes or areas of high demand.</li>
              <li>In the Choropleth Map, darker colors typically indicate higher prices or conflict intensity. Pay attention to regional clusters and outliers.</li>
              <li>For the Network Graph, larger nodes or thicker edges suggest more significant market connections. Isolated nodes may indicate less integrated markets.</li>
              <li>In the Diagnostics section, look for statistically significant results (p-value &lt; 0.05) which indicate meaningful spatial relationships.</li>
              <li>In Regression Results, coefficients show the strength and direction of relationships. Positive values indicate direct relationships, negative values inverse relationships.</li>
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