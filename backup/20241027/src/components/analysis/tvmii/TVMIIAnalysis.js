// src/components/TVMIIAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/utils';
import useTVMIIData from '../../../hooks/useTVMIIData';
import TVMIIChart from './TVMIIChart';
import TVMIIMarketPairsChart from './TVMIIMarketPairsChart';
import TVMIIInterpretation from './TVMIIInterpretation';
import TVMIITutorial from './TVMIITutorial';

const TVMIIAnalysis = ({ selectedCommodity }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const { tvmiiData, marketPairsData, status, error } = useTVMIIData();

  const [processedTVMIIData, setProcessedTVMIIData] = useState([]);
  const [processedMarketPairsData, setProcessedMarketPairsData] = useState([]);

  useEffect(() => {
    if (tvmiiData && marketPairsData) {
      try {
        // Filter and process tvmiiData for the selected commodity
        const processedTVMII = tvmiiData.filter(
          (item) =>
            item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        );
        setProcessedTVMIIData(processedTVMII);

        // Filter and process marketPairsData for the selected commodity
        const processedMarketPairs = marketPairsData.filter(
          (item) =>
            item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        );
        setProcessedMarketPairsData(processedMarketPairs);
      } catch (err) {
        setProcessedTVMIIData([]);
        setProcessedMarketPairsData([]);
      }
    }
  }, [tvmiiData, marketPairsData, selectedCommodity]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDownloadCsv = () => {
    if (processedTVMIIData.length === 0 && processedMarketPairsData.length === 0) {
      return;
    }

    const dataToDownload = {
      TVMII: processedTVMIIData || [],
      MarketPairs: processedMarketPairsData || [],
    };

    const csv = jsonToCsv(dataToDownload);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_TVMII_Analysis.csv`);
  };

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
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (processedTVMIIData.length === 0 && processedMarketPairsData.length === 0) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No TV-MII data available for <strong>{selectedCommodity}</strong>.
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
          TV-MII Analysis: {selectedCommodity}
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

        <TVMIITutorial />
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
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
          label="TV-MII Chart"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        {processedMarketPairsData.length > 0 && (
          <Tab
            label="Market Pairs"
            sx={{
              minWidth: isMobile ? 'auto' : 150,
              fontSize: isMobile ? '0.8rem' : '1rem',
              textTransform: 'none',
            }}
          />
        )}
        <Tab
          label="Interpretation"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <TVMIIChart
            data={processedTVMIIData}
            selectedCommodity={selectedCommodity}
            isMobile={isMobile}
          />
        )}
        {activeTab === 1 && processedMarketPairsData.length > 0 && (
          <TVMIIMarketPairsChart
            data={processedMarketPairsData}
            selectedCommodity={selectedCommodity}
          />
        )}
        {activeTab === (processedMarketPairsData.length > 0 ? 2 : 1) && (
          <TVMIIInterpretation
            data={processedTVMIIData}
            marketPairsData={processedMarketPairsData}
            selectedCommodity={selectedCommodity}
          />
        )}
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography
            variant="body1"
            component="div"
            sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
          >
            The TV-MII analysis provides insights into the dynamic nature of market integration:
            <ul>
              <li>
                A TV-MII value close to 1 indicates high market integration, while values close to 0
                suggest low integration.
              </li>
              <li>
                The TV-MII Chart shows how market integration changes over time for the selected
                commodity.
              </li>
              {processedMarketPairsData.length > 0 && (
                <li>
                  The Market Pairs Chart compares integration levels between different market pairs.
                </li>
              )}
              <li>
                Look for trends, sudden changes, or cyclical patterns in the TV-MII values to
                understand market dynamics.
              </li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

TVMIIAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
};

export default TVMIIAnalysis;
