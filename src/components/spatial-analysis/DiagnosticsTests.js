import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  TableHead
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { green, red } from '@mui/material/colors';
import { Scatter } from 'react-chartjs-2';
import 'chart.js/auto';
import ResidualsList from './ResidualsList';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No diagnostics tests available.
      </Typography>
    );
  }

  const { moran_i = {}, vif = [], residual = [] } = data;

  // Sample residuals for plotting to enhance performance
  const sampledResiduals = useMemo(() => {
    const sampleSize = 1000;
    return residual.slice(0, sampleSize);
  }, [residual]);

  const residualValues = sampledResiduals.map((item) => item.residual);

  const residualsPlotData = useMemo(() => ({
    labels: residualValues.map((_, index) => index + 1),
    datasets: [
      {
        label: 'Residuals',
        data: residualValues.map((residual, index) => ({ x: index + 1, y: residual })),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        pointHoverRadius: 6,
        pointRadius: 4,
      },
    ],
  }), [residualValues]);

  const residualsPlotOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Residual: ${context.parsed.y.toFixed(4)}`;
          },
        },
      },
      title: { display: true, text: 'Residuals vs. Fitted Values' },
    },
    scales: {
      x: {
        title: { display: true, text: 'Fitted Values Index' },
        ticks: { display: false },
      },
      y: {
        title: { display: true, text: 'Residuals' },
      },
    },
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostics Tests
      </Typography>
      <TableContainer>
        <Table aria-label="Diagnostics Tests Table">
          <TableHead>
            <TableRow>
              <TableCell>Test</TableCell>
              <TableCell>Statistic</TableCell>
              <TableCell>P-Value</TableCell>
              <TableCell>Significant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Moran's I */}
            {moran_i.I !== undefined && moran_i['p-value'] !== undefined ? (
              <TableRow>
                <TableCell>Moran&apos;s I</TableCell>
                <TableCell>{moran_i.I.toFixed(4)}</TableCell>
                <TableCell>{moran_i['p-value'].toFixed(4)}</TableCell>
                <TableCell>
                  {moran_i['p-value'] < 0.05 ? (
                    <Tooltip title="Significantly Spatially Autocorrelated">
                      <CheckCircle sx={{ color: green[500] }} aria-label="Significant" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Not Spatially Autocorrelated">
                      <Cancel sx={{ color: red[500] }} aria-label="Not Significant" />
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="error">
                    Moran&apos;s I data is incomplete.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {/* VIFs */}
            {vif.length > 0 ? (
              vif.map((item, index) => (
                <TableRow key={item.Variable || index}>
                  <TableCell>VIF: {item.Variable}</TableCell>
                  <TableCell>{item.VIF.toFixed(4)}</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>
                    {item.VIF < 5 ? (
                      <Tooltip title="No Multicollinearity">
                        <CheckCircle sx={{ color: green[500] }} aria-label="No Multicollinearity" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="High Multicollinearity">
                        <Cancel sx={{ color: red[500] }} aria-label="High Multicollinearity" />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="error">
                    VIF data is missing.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Residuals vs Fitted Values Scatter Plot */}
      {sampledResiduals.length > 0 && (
        <Paper sx={{ mt: 4, p: 2, height: '400px' }}>
          <Scatter data={residualsPlotData} options={residualsPlotOptions} />
          <ResidualsList residuals={residual} />
          <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
            Hover over points to see residual values.
          </Typography>
        </Paper>
      )}
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }),
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string.isRequired,
        VIF: PropTypes.number.isRequired,
      })
    ),
    residual: PropTypes.arrayOf(
      PropTypes.shape({
        region_id: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        residual: PropTypes.number.isRequired,
      })
    ),
  }),
};

export default DiagnosticsTests;
