// src/components/ecm-analysis/ECMAnalysis.js

import React, { useState } from 'react';
import { 
  Tabs, Tab, Box, Paper, Typography, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useECMData from '../../hooks/useECMData';
import PropTypes from 'prop-types';

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} id={`ecm-tabpanel-${index}`}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const SummaryTab = ({ data }) => (
  <div>
    <Typography variant="h6" gutterBottom>Summary</Typography>
    <TableContainer component={Paper}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>AIC</TableCell>
            <TableCell>{data.aic.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>BIC</TableCell>
            <TableCell>{data.bic.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>HQIC</TableCell>
            <TableCell>{data.hqic.toFixed(4)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </div>
);

const DiagnosticsTab = ({ diagnostics }) => (
  <div>
    <Typography variant="h6" gutterBottom>Diagnostics</Typography>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Test</TableCell>
            <TableCell>Statistic</TableCell>
            <TableCell>P-value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Breusch-Godfrey</TableCell>
            <TableCell>{diagnostics.breusch_godfrey_stat.toFixed(4)}</TableCell>
            <TableCell>{diagnostics.breusch_godfrey_pvalue.toExponential(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ARCH</TableCell>
            <TableCell>{diagnostics.arch_test_stat.toFixed(4)}</TableCell>
            <TableCell>{diagnostics.arch_test_pvalue.toExponential(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jarque-Bera</TableCell>
            <TableCell>{diagnostics.jarque_bera_stat.toFixed(4)}</TableCell>
            <TableCell>{diagnostics.jarque_bera_pvalue.toExponential(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Durbin-Watson</TableCell>
            <TableCell>{diagnostics.durbin_watson_stat.toFixed(4)}</TableCell>
            <TableCell>N/A</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </div>
);

const IRFTab = ({ irfData }) => {
  const chartData = irfData.irf.map((point, index) => ({
    period: index,
    response1: point[0][0],
    response2: point[0][1],
    response3: point[1][0],
    response4: point[1][1],
  }));

  return (
    <div>
      <Typography variant="h6" gutterBottom>Impulse Response Function</Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="response1" stroke="#8884d8" name="Response 1" />
          <Line type="monotone" dataKey="response2" stroke="#82ca9d" name="Response 2" />
          <Line type="monotone" dataKey="response3" stroke="#ffc658" name="Response 3" />
          <Line type="monotone" dataKey="response4" stroke="#ff7300" name="Response 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const GrangerCausalityTab = ({ grangerData }) => (
  <div>
    <Typography variant="h6" gutterBottom>Granger Causality</Typography>
    {Object.entries(grangerData).map(([variable, tests]) => (
      <div key={variable}>
        <Typography variant="subtitle1" gutterBottom>{variable}</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lags</TableCell>
                <TableCell>F-test p-value</TableCell>
                <TableCell>Chi-squared test p-value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(tests).map(([lag, results]) => (
                <TableRow key={lag}>
                  <TableCell>{lag}</TableCell>
                  <TableCell>{results.ssr_ftest_pvalue.toExponential(4)}</TableCell>
                  <TableCell>{results.ssr_chi2test_pvalue.toExponential(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    ))}
  </div>
);

const ECMAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { data, status, error } = useECMData();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
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

  if (status !== 'succeeded' || !data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No ECM data available. Please try again later.</Typography>
      </Box>
    );
  }

  const selectedData = data.find(
    item => item.commodity === selectedCommodity && item.regime === selectedRegime
  );

  if (!selectedData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No data available for {selectedCommodity} in {selectedRegime} regime.</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ p: 2 }}>
        ECM Analysis: {selectedCommodity} - {selectedRegime}
      </Typography>
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Summary" />
        <Tab label="Diagnostics" />
        <Tab label="IRF" />
        <Tab label="Granger Causality" />
      </Tabs>
      <TabPanel value={activeTab} index={0}>
        <SummaryTab data={selectedData} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <DiagnosticsTab diagnostics={selectedData.diagnostics} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <IRFTab irfData={selectedData.irf.impulse_response} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <GrangerCausalityTab grangerData={selectedData.granger_causality} />
      </TabPanel>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default ECMAnalysis;