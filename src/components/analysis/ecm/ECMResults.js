// src/components/analysis/ecm/ECMResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider, // Import Divider
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ScatterChart,
  Scatter,
} from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

/**
 * ECMResults Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.selectedData - ECM analysis data for a specific commodity/regime
 * @param {boolean} props.isMobile - Flag to determine if the view is mobile
 * @param {string} props.analysisType - Type of analysis ('unified' or 'directional')
 * @param {string} props.direction - Direction of analysis ('northToSouth' or 'southToNorth')
 */
const ECMResults = ({ selectedData, isMobile, analysisType, direction }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('ecm');

  // Debugging: Log selectedData to verify contents
  console.log('Selected Data:', selectedData);

  // Access regression results directly since alpha, beta, gamma are top-level
  const regressionResults = selectedData || {};

  // Prepare data for charts
  const residualsData =
    selectedData.residuals && selectedData.fittedValues
      ? selectedData.residuals.map((residual, index) => ({
          index,
          residual,
          fitted: selectedData.fittedValues[index],
        }))
      : [];

  const irfData = selectedData.irf
    ? selectedData.irf.map((point, index) => ({
        period: index,
        usd_price: point[0][0],
        conflict_intensity: point[1][0],
      }))
    : [];

  const grangerData =
    selectedData.granger_causality && selectedData.granger_causality.conflict_intensity
      ? Object.entries(selectedData.granger_causality.conflict_intensity).map(
          ([lag, data]) => ({
            lag: parseInt(lag),
            pValue: data.ssr_ftest_pvalue,
            significant: data.ssr_ftest_pvalue < 0.05,
          })
        )
      : [];

  const spatialData = selectedData.spatial_autocorrelation
    ? [
        {
          variable: 'Variable 1',
          moranI: selectedData.spatial_autocorrelation.Variable_1?.Moran_I || null,
          pValue: selectedData.spatial_autocorrelation.Variable_1?.Moran_p_value || null,
          isSignificant:
            selectedData.spatial_autocorrelation.Variable_1?.Moran_p_value < 0.05,
        },
        {
          variable: 'Variable 2',
          moranI: selectedData.spatial_autocorrelation.Variable_2?.Moran_I || null,
          pValue: selectedData.spatial_autocorrelation.Variable_2?.Moran_p_value || null,
          isSignificant:
            selectedData.spatial_autocorrelation.Variable_2?.Moran_p_value < 0.05,
        },
      ]
    : [];

  // Key Insights
  const keyInsights = [
    {
      title: 'Adjustment Speed (Alpha)',
      value:
        regressionResults.alpha !== undefined && regressionResults.alpha !== null
          ? regressionResults.alpha.toFixed(4)
          : 'N/A',
      interpretation:
        regressionResults.alpha !== undefined && regressionResults.alpha !== null
          ? regressionResults.alpha < 0
            ? 'Negative alpha indicates convergence towards equilibrium.'
            : 'Positive alpha suggests divergence from equilibrium.'
          : 'Alpha value is not available.',
    },
    {
      title: 'Long-run Relationship (Beta)',
      value:
        regressionResults.beta !== undefined && regressionResults.beta !== null
          ? regressionResults.beta.toFixed(4)
          : 'N/A',
      interpretation:
        regressionResults.beta !== undefined && regressionResults.beta !== null
          ? regressionResults.beta > 0
            ? 'Positive long-term relationship between variables.'
            : 'Negative long-term relationship between variables.'
          : 'Beta value is not available.',
    },
    {
      title: 'Short-term Dynamics (Gamma)',
      value:
        regressionResults.gamma !== undefined && regressionResults.gamma !== null
          ? regressionResults.gamma.toFixed(4)
          : 'N/A',
      interpretation:
        regressionResults.gamma !== undefined && regressionResults.gamma !== null
          ? 'Represents immediate impact of changes in independent variable.'
          : 'Gamma value is not available.',
    },
  ];

  // Access diagnostics for Variable_1 and Variable_2
  const diagnosticsVar1 = selectedData.diagnostics
    ? selectedData.diagnostics.Variable_1
    : null;

  const diagnosticsVar2 = selectedData.diagnostics
    ? selectedData.diagnostics.Variable_2
    : null;

  return (
    <Box>
      {/* Key Insights */}
      <Typography variant="h6" gutterBottom>
        Key Insights
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {keyInsights.map((insight, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {insight.title}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {insight.value}
              </Typography>
              <Typography variant="body2">{insight.interpretation}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Residuals Analysis */}
      <Typography variant="h6" gutterBottom>
        Residuals Analysis
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {residualsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={residualsData}>
              <CartesianGrid />
              <XAxis
                dataKey="fitted"
                name="Fitted Values"
                label={{ value: 'Fitted Values', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                dataKey="residual"
                name="Residuals"
                label={{ value: 'Residuals', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Residuals" data={residualsData} fill="#8884d8" />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2">No residuals data available.</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 2 }}>
          The residuals chart helps assess the model's accuracy and identify any patterns that may
          suggest model inadequacy.
        </Typography>
      </Paper>

      {/* Impulse Response Function */}
      <Typography variant="h6" gutterBottom>
        Impulse Response Function (IRF)
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {irfData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={irfData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                label={{ value: 'Period', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Response', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="usd_price"
                stroke="#8884d8"
                name="USD Price Response"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="conflict_intensity"
                stroke="#82ca9d"
                name="Conflict Intensity Response"
                dot={false}
              />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2">No IRF data available.</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 2 }}>
          The IRF shows how variables respond over time to a shock in one of the variables.
        </Typography>
      </Paper>

      {/* Granger Causality */}
      <Typography variant="h6" gutterBottom>
        Granger Causality Test Results
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {grangerData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grangerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="lag"
                label={{ value: 'Lag', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'P-Value', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="pValue" fill="#8884d8" name="P-Value">
                {grangerData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.significant ? '#ff4d4f' : '#8884d8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2">No Granger causality data available.</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 2 }}>
          Granger causality tests whether one time series can predict another. Bars in red indicate
          statistically significant causality.
        </Typography>
      </Paper>

      {/* Spatial Autocorrelation */}
      {spatialData.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Spatial Autocorrelation (Moran's I)
          </Typography>
          <Paper sx={{ p: 2, mb: 3 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spatialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variable" />
                <YAxis
                  yAxisId="left"
                  label={{ value: "Moran's I", angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'P-Value', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Bar yAxisId="left" dataKey="moranI" fill="#8884d8" name="Moran's I" />
                <Bar yAxisId="right" dataKey="pValue" fill="#82ca9d" name="P-Value" />
              </BarChart>
            </ResponsiveContainer>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Moran's I measures spatial autocorrelation, indicating whether similar values cluster
              spatially.
            </Typography>
          </Paper>
        </>
      )}

      {/* Model Diagnostics */}
      <Typography variant="h6" gutterBottom>
        Model Diagnostics
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {diagnosticsVar1 && diagnosticsVar2 ? (
          <>
            {/* Diagnostics for Variable 1 */}
            <Typography variant="subtitle1" gutterBottom>
              Diagnostics for Variable 1
            </Typography>
            {diagnosticsVar1.jarque_bera_pvalue < 0.05 ? (
              <Alert severity="warning">
                Residuals do not appear to be normally distributed (Jarque-Bera test p-value &lt;
                0.05).
              </Alert>
            ) : (
              <Alert severity="success">
                Residuals appear to be normally distributed (Jarque-Bera test p-value &gt; 0.05).
              </Alert>
            )}
            {diagnosticsVar1.durbin_watson_stat < 1.5 ||
            diagnosticsVar1.durbin_watson_stat > 2.5 ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Potential autocorrelation detected (Durbin-Watson statistic:{' '}
                {diagnosticsVar1.durbin_watson_stat.toFixed(2)}).
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                No significant autocorrelation detected (Durbin-Watson statistic:{' '}
                {diagnosticsVar1.durbin_watson_stat.toFixed(2)}).
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Diagnostics for Variable 2 */}
            <Typography variant="subtitle1" gutterBottom>
              Diagnostics for Variable 2
            </Typography>
            {diagnosticsVar2.jarque_bera_pvalue < 0.05 ? (
              <Alert severity="warning">
                Residuals do not appear to be normally distributed (Jarque-Bera test p-value &lt;
                0.05).
              </Alert>
            ) : (
              <Alert severity="success">
                Residuals appear to be normally distributed (Jarque-Bera test p-value &gt; 0.05).
              </Alert>
            )}
            {diagnosticsVar2.durbin_watson_stat < 1.5 ||
            diagnosticsVar2.durbin_watson_stat > 2.5 ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Potential autocorrelation detected (Durbin-Watson statistic:{' '}
                {diagnosticsVar2.durbin_watson_stat.toFixed(2)}).
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                No significant autocorrelation detected (Durbin-Watson statistic:{' '}
                {diagnosticsVar2.durbin_watson_stat.toFixed(2)}).
              </Alert>
            )}
          </>
        ) : (
          <Typography variant="body2">No diagnostics data available.</Typography>
        )}
      </Paper>

      {/* Interpretation Guide */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            This ECM analysis provides insights into the relationship between commodity prices and
            conflict intensity. Key points to consider:
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                <strong>Key Insights:</strong> Highlights the most critical findings including
                adjustment speed (Alpha), long-run relationship (Beta), and short-term dynamics
                (Gamma).
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Residuals Analysis:</strong> Assesses the model's accuracy by visualizing
                residuals against fitted values.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Impulse Response Function (IRF):</strong> Shows how variables respond
                over time to a shock in one of the variables.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Granger Causality:</strong> Tests whether one time series can predict
                another.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Spatial Autocorrelation (Moran's I):</strong> Indicates whether similar
                values cluster spatially.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Model Diagnostics:</strong> Evaluates the validity of model assumptions,
                including normality of residuals and autocorrelation.
              </Typography>
            </li>
          </ul>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

ECMResults.propTypes = {
  selectedData: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
  analysisType: PropTypes.string.isRequired,
  direction: PropTypes.string,
};

export default ECMResults;
