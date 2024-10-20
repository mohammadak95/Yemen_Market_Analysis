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

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [activeTab, setActiveTab] = useState(1);
  const { geoData, flowMaps, analysisResults, loading, error, uniqueMonths } = useSpatialData();

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  console.log('[Debug] SpatialAnalysis Props:', { selectedCommodity, windowWidth });

  useEffect(() => {
    console.log('[Debug] Data fetched from useSpatialData:', { geoData, flowMaps, analysisResults, loading, error, uniqueMonths });
  }, [geoData, flowMaps, analysisResults, loading, error, uniqueMonths]);

  // Adjusted formatDate to return "YYYY-MM" for month-level comparison
  const formatDate = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('[Warning] Invalid date provided to formatDate:', date);
      return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    return `${year}-${month}`; // Returns "YYYY-MM"
  }, []);

  const sortedUniqueMonths = useMemo(() => {
    return [...uniqueMonths].sort((a, b) => a - b);
  }, [uniqueMonths]);

  useEffect(() => {
    if (sortedUniqueMonths.length > 0 && geoData && !loading) {
      let latestValidDate = null;
      let latestValidIndex = -1;

      console.log('Searching for data with commodity:', selectedCommodity.toLowerCase());

      for (let i = sortedUniqueMonths.length - 1; i >= 0; i--) {
        const month = sortedUniqueMonths[i];
        const formattedDate = formatDate(month);
        console.log(`Checking for data in month: ${formattedDate}`);

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
          console.log(`Found ${matchingFeatures.length} matching features for month ${formattedDate}`);
          break;
        } else {
          console.log(`No matching features found for month ${formattedDate}`);
        }
      }

      if (latestValidDate) {
        setSelectedMonthIndex(latestValidIndex);
        setSelectedDate(latestValidDate);
        console.log(`[Debug] setSelectedMonthIndex to ${latestValidIndex} (${formatDate(latestValidDate)})`);
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
    console.log('Formatting selected date:', selectedDate, 'to:', formattedSelectedDate);

    const filteredFeatures = geoData.features.filter((feature) => {
      const featureDateObj = new Date(feature.properties.date);
      const featureYear = featureDateObj.getFullYear();
      const featureMonth = String(featureDateObj.getMonth() + 1).padStart(2, '0');
      const featureFormattedDate = `${featureYear}-${featureMonth}`;
      const match = featureFormattedDate === formattedSelectedDate && 
        feature.properties.commodity && 
        feature.properties.commodity.toLowerCase() === selectedCommodity.toLowerCase();

      if (match) {
        console.log('Matched feature:', feature);
      }

      return match;
    });

    console.log(`Filtered ${filteredFeatures.length} features for ${selectedCommodity.toLowerCase()} on ${formattedSelectedDate}`);

    return {
      ...geoData,
      features: filteredFeatures,
    };
  }, [geoData, selectedDate, formatDate, selectedCommodity]);

  useEffect(() => {
    console.log(`[Debug] selectedDate: ${selectedDate}, selectedMonthIndex: ${selectedMonthIndex}`);
  }, [selectedDate, selectedMonthIndex]);

  const currentAnalysis = useMemo(() => {
    if (!analysisResults || !selectedCommodity) {
      return null;
    }
    return analysisResults.find(r => r.commodity.toLowerCase() === selectedCommodity.toLowerCase());
  }, [analysisResults, selectedCommodity]);

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
        console.log(`[Debug] setSelectedMonthIndex to ${newIndex} (${formattedNewDate})`);
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

  console.log('Filtered GeoData:', filteredGeoData);
  console.log('Selected Date:', selectedDate);
  console.log('Selected Commodity:', selectedCommodity);

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
              selectedMonthIndex={selectedMonthIndex}
              onDateChange={handleDateChange}
              uniqueMonths={sortedUniqueMonths}
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
              <li>
                <strong>Animated Flow Map:</strong> Look for patterns in commodity movement. Strong flows may indicate established trade routes or areas of high demand.
              </li>
              <li>
                <strong>Choropleth Map:</strong> Darker colors typically indicate higher prices or conflict intensity. Pay attention to regional clusters and outliers.
              </li>
              <li>
                <strong>Network Graph:</strong> Larger nodes or thicker edges suggest more significant market connections. Isolated nodes may indicate less integrated markets.
              </li>
              <li>
                <strong>Diagnostics:</strong> Look for statistically significant results (p-value &lt; 0.05) which indicate meaningful spatial relationships.
              </li>
              <li>
                <strong>Regression Results:</strong> Coefficients show the strength and direction of relationships. Positive values indicate direct relationships, negative values inverse relationships.
              </li>
            </ul>
            <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
              Key Considerations:
            </Typography>
            <ul>
              <li>Consider how conflict intensity correlates with {selectedCommodity} prices across different regions.</li>
              <li>Look for temporal trends: How do patterns change over time? Are there seasonal effects?</li>
              <li>Think about geographical factors: How might terrain, infrastructure, or political boundaries influence the observed patterns?</li>
              <li>Consider economic policies: How might different exchange rate regimes affect prices and trade flows?</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Key Insights
        </Typography>
        {currentAnalysis ? (
          <ul>
            {generateKeyInsights(currentAnalysis, selectedCommodity).map((insight, index) => (
              <li key={index}>
                <Typography variant="body2">{insight}</Typography>
              </li>
            ))}
          </ul>
        ) : (
          <Typography variant="body2">
            No analysis data available to generate insights.
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

// Helper function to generate key insights
const generateKeyInsights = (analysisData, commodity) => {
  const insights = [];

  if (analysisData.spatial_autocorrelation) {
    const { Variable_1, Variable_2 } = analysisData.spatial_autocorrelation;
    if (Variable_1.Moran_I > 0 && Variable_1.Moran_p_value < 0.05) {
      insights.push(`There is significant positive spatial autocorrelation in ${commodity} prices (Moran's I: ${Variable_1.Moran_I.toFixed(3)}, p-value: ${Variable_1.Moran_p_value.toFixed(3)}), indicating that similar price levels tend to cluster geographically.`);
    }
    if (Variable_2.Moran_I > 0 && Variable_2.Moran_p_value < 0.05) {
      insights.push(`Conflict intensity shows significant positive spatial autocorrelation (Moran's I: ${Variable_2.Moran_I.toFixed(3)}, p-value: ${Variable_2.Moran_p_value.toFixed(3)}), suggesting that areas of high conflict tend to be near each other.`);
    }
  }

  if (analysisData.regression_results) {
    const { coefficients, p_values } = analysisData.regression_results;
    if (coefficients.conflict_intensity && p_values.conflict_intensity < 0.05) {
      const effect = coefficients.conflict_intensity > 0 ? "positive" : "negative";
      insights.push(`Conflict intensity has a statistically significant ${effect} effect on ${commodity} prices (coefficient: ${coefficients.conflict_intensity.toFixed(3)}, p-value: ${p_values.conflict_intensity.toFixed(3)}).`);
    }
  }

  if (insights.length === 0) {
    insights.push(`No statistically significant spatial patterns were found for ${commodity} prices or conflict intensity.`);
  }

  return insights;
};

export default SpatialAnalysis;
