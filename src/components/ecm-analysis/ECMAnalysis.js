import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import useECMData from '../../hooks/useECMData';
import PropTypes from 'prop-types';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import ResidualsChart from './ResidualsChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';

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
  const { data, status, error } = useECMData();
  const [selectedData, setSelectedData] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (status === 'succeeded' && data) {
      const foundData = data.find(
        (item) => item.commodity === selectedCommodity && item.regime === selectedRegime
      );
      setSelectedData(foundData);
    }
  }, [status, data, selectedCommodity, selectedRegime]);

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
        <Typography variant="h5" gutterBottom>
          ECM Analysis: {selectedCommodity} - {selectedRegime}
          <Tooltip title="Error Correction Model (ECM) analysis examines the short-term and long-term relationships between variables.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered variant="scrollable" scrollButtons="auto">
        <Tab label="Summary" />
        <Tab label="Diagnostics" />
        <Tab label="IRF" />
        <Tab label="Residuals" />
        <Tab label="Granger Causality" />
        <Tab label="Spatial Autocorrelation" />
      </Tabs>
      <TabPanel value={activeTab} index={0}>
        <SummaryTable data={selectedData} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <DiagnosticsTable diagnostics={selectedData.diagnostics} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <IRFChart irfData={selectedData.irf} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <ResidualsChart
          residuals={selectedData.diagnostics.Variable_1.acf}
          fittedValues={selectedData.diagnostics.Variable_1.pacf}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <GrangerCausalityChart grangerData={selectedData.granger_causality} />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <SpatialAutocorrelationChart spatialData={selectedData.spatial_autocorrelation} />
      </TabPanel>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">
            This ECM analysis provides insights into the relationship between commodity prices and conflict intensity.
            Key points to consider:
            <ul>
              <li>The Summary tab shows overall model fit statistics.</li>
              <li>Diagnostics tab provides tests for model assumptions.</li>
              <li>IRF shows how variables respond to shocks over time.</li>
              <li>Residuals chart helps assess model accuracy.</li>
              <li>Granger Causality examines predictive relationships.</li>
              <li>Spatial Autocorrelation indicates geographical dependencies.</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default ECMAnalysis;