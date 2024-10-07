// src/components/ecm-analysis/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import useECMData from '../../hooks/useECMData';
import PropTypes from 'prop-types';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import ResidualsChart from './ResidualsChart';

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} id={`ecm-tabpanel-${index}`} aria-labelledby={`ecm-tab-${index}`}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const ECMAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedLags, setSelectedLags] = useState(4);
  const { data, status, error } = useECMData();
  const [selectedData, setSelectedData] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(selectedData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ECM_Results_${selectedCommodity}_${selectedRegime}.json`;
    link.click();
  };

  useEffect(() => {
    if (status === 'succeeded' && data) {
      const foundData = data.find(
        (item) => item.commodity === selectedCommodity && item.regime === selectedRegime
      );
      if (foundData) {
        // If fit_metrics are missing, compute them
        if (!foundData.fit_metrics && foundData.residuals && foundData.fitted_values) {
          const n = foundData.residuals.length;
          const residualSumOfSquares = foundData.residuals.reduce((sum, val) => sum + val ** 2, 0);
          const totalSumOfSquares = foundData.fitted_values.reduce(
            (sum, val) => sum + (val - foundData.mean_price) ** 2,
            0
          );
          const rSquared = 1 - residualSumOfSquares / totalSumOfSquares;
          const adjRSquared = 1 - (1 - rSquared) * ((n - 1) / (n - selectedLags - 1));

          foundData.fit_metrics = {
            r_squared: rSquared,
            adj_r_squared: adjRSquared,
          };
        }

        setSelectedData(foundData);
      }
    }
  }, [status, data, selectedCommodity, selectedRegime, selectedLags]);

  if (status === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading ECM Analysis results...
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!selectedData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>
          No data available for {selectedCommodity} in {selectedRegime} regime.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">
          ECM Analysis: {selectedCommodity} - {selectedRegime}
        </Typography>
        <Typography variant="body2" gutterBottom>
          The Error Correction Model (ECM) captures both short-term dynamics and long-term
          equilibrium relationships between commodity prices and conflict intensity.
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120, mt: 2 }}>
          <InputLabel id="lag-select-label">Lags</InputLabel>
          <Select
            labelId="lag-select-label"
            value={selectedLags}
            onChange={(e) => setSelectedLags(e.target.value)}
            label="Lags"
          >
            {[1, 2, 3, 4, 5].map((lag) => (
              <MenuItem key={lag} value={lag}>
                {lag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" sx={{ ml: 2, mt: 2 }} onClick={handleDownload}>
          Download ECM Results
        </Button>
      </Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Summary" />
        <Tab label="Diagnostics" />
        <Tab label="IRF" />
        <Tab label="Residuals Analysis" />
      </Tabs>
      <TabPanel value={activeTab} index={0}>
        <SummaryTable
          data={selectedData}
          selectedCommodity={selectedCommodity}
          selectedRegime={selectedRegime}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <DiagnosticsTable diagnostics={selectedData.diagnostics} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <IRFChart irfData={selectedData.irf.impulse_response} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <ResidualsChart
          residuals={selectedData.residuals}
          fittedValues={selectedData.fitted_values}
        />
      </TabPanel>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default ECMAnalysis;
