import React, { useMemo } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Box,
  Tooltip,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import LISAMap from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import SpatialMetricCard from '../common/SpatialMetricCard';
import { useSpatialAutocorrelation } from '../../hooks/useSpatialAutocorrelation';

const SpatialAutocorrelationAnalysis = ({ spatialData, geometryData }) => {
  const { 
    moranI, 
    pValue, 
    zScore, 
    clusterCounts,
    loading,
    error 
  } = useSpatialAutocorrelation(spatialData);

  const localMorans = useMemo(() => {
    return spatialData?.spatialAutocorrelation?.local || {};
  }, [spatialData]);

  const significanceLevel = useMemo(() => {
    if (!pValue) return 'Not Significant';
    if (pValue < 0.01) return 'Highly Significant (p < 0.01)';
    if (pValue < 0.05) return 'Significant (p < 0.05)';
    return 'Not Significant';
  }, [pValue]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!spatialData?.spatialAutocorrelation) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No spatial autocorrelation data available.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Spatial Autocorrelation Analysis
            <Tooltip title="Analyze spatial patterns in market prices">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                LISA Cluster Map
              </Typography>
              <LISAMap 
                localMorans={localMorans}
                geometry={geometryData}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Moran Scatter Plot
              </Typography>
              <MoranScatterPlot 
                data={spatialData.spatialAutocorrelation}
                timeSeriesData={spatialData.timeSeriesData}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <SpatialMetricCard
                title="Global Moran's I"
                value={moranI || 0}
                format="number"
                description="Measure of overall spatial autocorrelation"
                tooltip="Values range from -1 (perfect dispersion) to +1 (perfect clustering)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SpatialMetricCard
                title="P-Value"
                value={pValue || 0}
                format="number"
                description="Statistical significance"
                tooltip="Values < 0.05 indicate significant patterns"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SpatialMetricCard
                title="Z-Score"
                value={zScore || 0}
                format="number"
                description="Standard deviations from random"
                tooltip="Values > 1.96 or < -1.96 indicate significant patterns"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SpatialMetricCard
                title="Cluster Count"
                value={clusterCounts?.total || 0}
                format="integer"
                description="Total number of significant clusters"
                tooltip="Sum of all significant spatial clusters and outliers"
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About This Visualization
              </Typography>
              <Typography variant="body2" paragraph>
                This analysis examines spatial patterns in Yemen's market prices, revealing how price behaviors are 
                related across geographic space. It helps identify clusters of markets with similar price patterns 
                and areas of price divergence.
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Key Features:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2">
                    <strong>LISA Map:</strong> Shows Local Indicators of Spatial Association, identifying:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>High-High Clusters (Red): Markets with high prices surrounded by high prices</li>
                    <li>Low-Low Clusters (Blue): Markets with low prices surrounded by low prices</li>
                    <li>High-Low Outliers (Pink): High-price markets surrounded by low prices</li>
                    <li>Low-High Outliers (Light Blue): Low-price markets surrounded by high prices</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2">
                    <strong>Moran Scatter Plot:</strong> Visualizes the relationship between each market's price 
                    and the average price of its neighbors.
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Slope = Global Moran's I statistic</li>
                    <li>Positive slope: Similar prices cluster together</li>
                    <li>Negative slope: Prices tend to disperse</li>
                    <li>Flat slope: Random spatial patterns</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2">
                    <strong>Statistical Metrics:</strong> Quantitative measures of spatial patterns:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Global Moran's I: Measures overall clustering (-1 to +1)</li>
                    <li>P-Value: Tests if pattern could occur randomly</li>
                    <li>Z-Score: Shows strength and direction of clustering</li>
                    <li>Cluster Count: Number of significant spatial patterns</li>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Interpretation Guide:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Strong positive autocorrelation (high Moran's I) suggests integrated markets where prices move 
                together across regions. This often indicates good trade connections and information flow. 
                Negative or weak autocorrelation may suggest market fragmentation due to trade barriers, 
                conflict zones, or poor infrastructure. Pay special attention to outliers (High-Low or Low-High), 
                as these may indicate markets that need intervention or support.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {clusterCounts && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cluster Analysis Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="error">
                      High-High Clusters
                    </Typography>
                    <Typography>{clusterCounts.highHigh || 0} markets</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="primary">
                      Low-Low Clusters
                    </Typography>
                    <Typography>{clusterCounts.lowLow || 0} markets</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="secondary">
                      High-Low Outliers
                    </Typography>
                    <Typography>{clusterCounts.highLow || 0} markets</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" sx={{ color: 'info.main' }}>
                      Low-High Outliers
                    </Typography>
                    <Typography>{clusterCounts.lowHigh || 0} markets</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default SpatialAutocorrelationAnalysis;
