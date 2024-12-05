// src/components/analysis/tvmii/TVMIIAnalysis.js

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Paper,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Download, ExpandMore } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { useTVMIIData, useTechnicalHelp } from '../../../hooks';
import TVMIIChart from './TVMIIChart';
import TVMIIMarketPairsChart from './TVMIIMarketPairsChart';
import TVMIIInterpretation from './TVMIIInterpretation';
import TVMIIFramework from './TVMIIFramework';
import { analysisStyles } from '../../../styles/analysisStyles';

const TVMIIAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State management
  const [viewType, setViewType] = useState('overall');
  const [frameworkExpanded, setFrameworkExpanded] = useState(false);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);
  const [filteredTVMIIData, setFilteredTVMIIData] = useState([]);
  const [filteredMarketPairsData, setFilteredMarketPairsData] = useState([]);

  // Custom hooks
  const { tvmiiData, marketPairsData, status, error } = useTVMIIData();
  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  // Effect to filter data based on selected commodity
  useEffect(() => {
    if (tvmiiData) {
      const dataForCommodity = tvmiiData.filter(
        (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setFilteredTVMIIData(dataForCommodity);
    }

    if (marketPairsData) {
      const marketPairsForCommodity = marketPairsData.filter(
        (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setFilteredMarketPairsData(marketPairsForCommodity);
    }
  }, [tvmiiData, marketPairsData, selectedCommodity]);

  // Handlers
  const handleViewTypeChange = (event, newViewType) => {
    if (newViewType) setViewType(newViewType);
  };

  const handleDownloadData = useCallback(() => {
    try {
      const dataToDownload = viewType === 'overall' ? filteredTVMIIData : filteredMarketPairsData;
      const blob = new Blob(
        [JSON.stringify(dataToDownload, null, 2)],
        { type: 'application/json' }
      );
      saveAs(blob, `tvmii_${viewType}_${selectedCommodity}.json`);
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  }, [viewType, filteredTVMIIData, filteredMarketPairsData, selectedCommodity]);

  // Determine if we have data to show
  const hasData = viewType === 'overall' 
    ? filteredTVMIIData.length > 0 
    : filteredMarketPairsData.length > 0;

  if (status === 'loading' || error) {
    return null; // AnalysisContainer will handle loading and error states
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Controls and Download Button */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              aria-label="View Type"
              size={isMobile ? 'small' : 'medium'}
              sx={styles.toggleGroup}
            >
              <ToggleButton value="overall">Overall TV-MII</ToggleButton>
              <ToggleButton value="marketPairs">Market Pairs</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadData}
              disabled={!hasData}
            >
              Download Results
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {hasData && (
        <>
          {/* Model Framework Section */}
          <Accordion 
            expanded={frameworkExpanded}
            onChange={() => setFrameworkExpanded(!frameworkExpanded)}
            sx={{ mb: 3 }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{
                backgroundColor: theme.palette.grey[50],
                '&:hover': {
                  backgroundColor: theme.palette.grey[100],
                }
              }}
            >
              <Typography variant="h6">
                Time-Varying Market Integration Index Framework
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TVMIIFramework 
                data={viewType === 'overall' ? filteredTVMIIData : filteredMarketPairsData}
              />
            </AccordionDetails>
          </Accordion>

          {/* Charts Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {viewType === 'overall' ? 'Overall Market Integration' : 'Market Pair Integration'}
            </Typography>
            {viewType === 'overall' ? (
              <TVMIIChart
                data={filteredTVMIIData}
                selectedCommodity={selectedCommodity}
                isMobile={isMobile}
              />
            ) : (
              <TVMIIMarketPairsChart
                data={filteredMarketPairsData}
                selectedCommodity={selectedCommodity}
                isMobile={isMobile}
              />
            )}
          </Paper>

          {/* Interpretation Section */}
          <Accordion
            expanded={interpretationExpanded}
            onChange={() => setInterpretationExpanded(!interpretationExpanded)}
            sx={{ mt: 3 }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{
                backgroundColor: theme.palette.grey[50],
                '&:hover': {
                  backgroundColor: theme.palette.grey[100],
                }
              }}
            >
              <Typography variant="h6">
                Market Integration Analysis Interpretation
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TVMIIInterpretation
                data={filteredTVMIIData}
                marketPairsData={filteredMarketPairsData}
                selectedCommodity={selectedCommodity}
                viewType={viewType}
                isMobile={isMobile}
              />
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
};

TVMIIAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default TVMIIAnalysis;
