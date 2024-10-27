// src/components/analysis/tvmii/TVMIIAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useTVMIIData from '../../../hooks/useTVMIIData';
import TVMIIChart from './TVMIIChart';
import TVMIIMarketPairsChart from './TVMIIMarketPairsChart';
import TVMIIInterpretation from './TVMIIInterpretation';
import TVMIITutorial from './TVMIITutorial';

const TVMIIAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const { tvmiiData, marketPairsData, status, error } = useTVMIIData();
  const [filteredTVMIIData, setFilteredTVMIIData] = useState([]);
  const [filteredMarketPairsData, setFilteredMarketPairsData] = useState([]);

  useEffect(() => {
    if (tvmiiData) {
      const dataForCommodity = tvmiiData.filter(
        (item) =>
          item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setFilteredTVMIIData(dataForCommodity);
    }

    if (marketPairsData) {
      const marketPairsForCommodity = marketPairsData.filter(
        (item) =>
          item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setFilteredMarketPairsData(marketPairsForCommodity);
    }
  }, [tvmiiData, marketPairsData, selectedCommodity]);

  if (status === 'loading') {
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
          Loading TV-MII Analysis results...
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (filteredTVMIIData.length === 0 && filteredMarketPairsData.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No TV-MII data available for <strong>{selectedCommodity}</strong>.
      </Alert>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: { xs: 2, sm: 4 },
        p: { xs: 1, sm: 2 },
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              fontWeight: 'bold',
              fontSize: isMobile ? '1.5rem' : '2rem',
            }}
          >
            TV-MII Analysis
            <Tooltip title="Time-Varying Market Integration Index Analysis Information">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          {/* Tutorial Button */}
          <TVMIITutorial />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Main Content - Vertical Layout */}
      <Box sx={{ width: '100%' }}>
        {/* TV-MII Chart */}
        {filteredTVMIIData.length > 0 ? (
          <TVMIIChart
            data={filteredTVMIIData}
            selectedCommodity={selectedCommodity}
            isMobile={isMobile}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No overall TV-MII data available for <strong>{selectedCommodity}</strong>.
          </Alert>
        )}

        {/* Market Pairs Chart */}
        {filteredMarketPairsData.length > 0 ? (
          <TVMIIMarketPairsChart
            data={filteredMarketPairsData}
            selectedCommodity={selectedCommodity}
            isMobile={isMobile}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No market pairs data available for <strong>{selectedCommodity}</strong>.
          </Alert>
        )}

        {/* Interpretation */}
        <TVMIIInterpretation
          data={filteredTVMIIData}
          marketPairsData={filteredMarketPairsData}
          selectedCommodity={selectedCommodity}
          isMobile={isMobile}
        />
      </Box>
    </Paper>
  );
};

TVMIIAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default TVMIIAnalysis;
