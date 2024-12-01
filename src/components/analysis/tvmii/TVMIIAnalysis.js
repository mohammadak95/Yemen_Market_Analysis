// src/components/analysis/tvmii/TVMIIAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useTVMIIData, useTechnicalHelp } from '../../../hooks';
import AnalysisContainer from '../../common/AnalysisContainer';
import ChartContainer from '../../common/ChartContainer';
import TVMIIChart from './TVMIIChart';
import TVMIIMarketPairsChart from './TVMIIMarketPairsChart';
import TVMIIInterpretation from './TVMIIInterpretation';
import { analysisStyles } from '../../../styles/analysisStyles';

const TVMIIAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State management
  const [viewType, setViewType] = useState('overall');
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

  // Analysis controls component
  const analysisControls = (
    <ToggleButtonGroup
      value={viewType}
      exclusive
      onChange={handleViewTypeChange}
      aria-label="View Type"
      sx={styles.toggleGroup}
    >
      <ToggleButton value="overall">Overall TV-MII</ToggleButton>
      <ToggleButton value="marketPairs">Market Pairs</ToggleButton>
    </ToggleButtonGroup>
  );

  // Determine if we have data to show
  const hasData = viewType === 'overall' 
    ? filteredTVMIIData.length > 0 
    : filteredMarketPairsData.length > 0;

  return (
    <AnalysisContainer
      title={`TV-MII Analysis: ${selectedCommodity}`}
      infoTooltip={getTechnicalTooltip('main')}
      loading={status === 'loading'}
      error={error}
      controls={analysisControls}
      hasData={hasData}
      selectedCommodity={selectedCommodity}
    >
      {viewType === 'overall' && filteredTVMIIData.length > 0 && (
        <ChartContainer>
          <TVMIIChart
            data={filteredTVMIIData}
            selectedCommodity={selectedCommodity}
            isMobile={isMobile}
          />
        </ChartContainer>
      )}

      {viewType === 'marketPairs' && filteredMarketPairsData.length > 0 && (
        <ChartContainer>
          <TVMIIMarketPairsChart
            data={filteredMarketPairsData}
            selectedCommodity={selectedCommodity}
            isMobile={isMobile}
          />
        </ChartContainer>
      )}

      <Box sx={styles.interpretationCard}>
        <TVMIIInterpretation
          data={filteredTVMIIData}
          marketPairsData={filteredMarketPairsData}
          selectedCommodity={selectedCommodity}
          isMobile={isMobile}
        />
      </Box>
    </AnalysisContainer>
  );
};

TVMIIAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default TVMIIAnalysis;
