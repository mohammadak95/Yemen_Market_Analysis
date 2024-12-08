import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  Grid,
  Alert,
  Button,
  Collapse,
  Divider,
  Chip,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { SIGNIFICANCE_LEVELS, CLUSTER_COLORS } from './types';

const SpatialAnalysisPanel = ({
  global,
  local,
  selectedRegion,
  clusters,
  spatialMetrics
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [showDetails, setShowDetails] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  // Format values for display with enhanced precision
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (value == null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  // Calculate enhanced analysis metrics
  const analysisMetrics = useMemo(() => {
    if (!local || !global) return null;

    const regions = Object.values(local);
    const significantCount = regions.filter(r => r.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT).length;
    const highlySignificantCount = regions.filter(r => r.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT).length;

    return {
      totalRegions: regions.length,
      significantCount,
      highlySignificantCount,
      significanceRate: significantCount / regions.length,
      averageLocalI: regions.reduce((sum, r) => sum + Math.abs(r.local_i), 0) / regions.length,
      spatialAssociation: Math.abs(global.moran_i) * (global.significance ? 1 : 0.5),
      clusterDistribution: {
        hotspots: regions.filter(r => r.cluster_type === 'high-high').length,
        coldspots: regions.filter(r => r.cluster_type === 'low-low').length,
        outliers: regions.filter(r => ['high-low', 'low-high'].includes(r.cluster_type)).length
      }
    };
  }, [local, global]);

  // Get selected region metrics with enhanced statistics
  const selectedMetrics = useMemo(() => {
    if (!selectedRegion || !local || !local[selectedRegion]) return null;

    const stats = local[selectedRegion];
    const confidenceInterval = stats.variance ? {
      lower: stats.local_i - 1.96 * Math.sqrt(stats.variance),
      upper: stats.local_i + 1.96 * Math.sqrt(stats.variance)
    } : null;

    return {
      ...stats,
      confidenceInterval,
      standardizedValue: stats.z_score,
      clusterStrength: Math.abs(stats.local_i) * (stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 1 : 0.5),
      significanceLevel: 
        stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 'Highly Significant' :
        stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 'Significant' :
        stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 'Marginally Significant' :
        'Not Significant'
    };
  }, [selectedRegion, local]);

  // Render significance chip
  const renderSignificanceChip = (level, pValue) => (
    <Box sx={{ mt: 0.5 }}>
      <Chip
        label={level}
        size="small"
        color={
          pValue <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? "success" :
          pValue <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? "primary" :
          pValue <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? "warning" :
          "default"
        }
      />
    </Box>
  );

  return (
    <Box sx={{ mt: 2 }}>
      {/* Global Statistics Summary */}
      <Card sx={{ mb: 2, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Global Spatial Association
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Tooltip title="Overall spatial autocorrelation measure">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Global Moran&apos;s I
                  </Typography>
                  <Typography variant="h5">
                    {formatValue(global?.moran_i)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    p-value: {formatValue(global?.p_value)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Strength of spatial patterns">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Spatial Association
                  </Typography>
                  <Typography variant="h5">
                    {formatValue(analysisMetrics?.spatialAssociation)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatPercentage(analysisMetrics?.significanceRate)} significant
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Statistical robustness">
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Z-Score
                  </Typography>
                  <Typography variant="h5">
                    {formatValue(global?.z_score)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {global?.significance ? 'Significant' : 'Not Significant'}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Cluster Analysis Summary */}
      <Card sx={{ mb: 2, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cluster Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Hot Spots
                </Typography>
                <Typography variant="h6">
                  {analysisMetrics?.clusterDistribution.hotspots || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  High-High Clusters
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Cold Spots
                </Typography>
                <Typography variant="h6">
                  {analysisMetrics?.clusterDistribution.coldspots || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Low-Low Clusters
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Spatial Outliers
                </Typography>
                <Typography variant="h6">
                  {analysisMetrics?.clusterDistribution.outliers || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  High-Low/Low-High
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Selected Region Analysis */}
      {selectedMetrics && (
        <Card sx={{ mb: 2, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {selectedRegion} Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Local Moran's I"
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {formatValue(selectedMetrics.local_i)}
                          </Typography>
                          {selectedMetrics.confidenceInterval && (
                            <Typography variant="caption" color="textSecondary">
                              95% CI: [{formatValue(selectedMetrics.confidenceInterval.lower)} to {
                                formatValue(selectedMetrics.confidenceInterval.upper)}]
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Significance"
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {renderSignificanceChip(
                            selectedMetrics.significanceLevel,
                            selectedMetrics.p_value
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Cluster Type"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: CLUSTER_COLORS[selectedMetrics.cluster_type],
                              opacity: 0.8,
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                          />
                          <Typography variant="body2">
                            {selectedMetrics.cluster_type.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join('-')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Cluster Strength"
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2">
                            {formatValue(selectedMetrics.clusterStrength)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Methodology Section */}
      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          onClick={() => setShowMethodology(!showMethodology)}
          endIcon={showMethodology ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          startIcon={<InfoOutlinedIcon />}
          sx={{ mb: 1 }}
        >
          Methodology
        </Button>
        <Collapse in={showMethodology}>
          <Paper sx={{ p: 2, boxShadow: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Spatial Autocorrelation Analysis Methodology
            </Typography>
            <Typography variant="body2" paragraph>
              This analysis uses Local Indicators of Spatial Association (LISA) to identify 
              statistically significant spatial clusters and outliers. The analysis combines:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Global Moran's I"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Measures overall spatial autocorrelation
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Local Moran's I"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Identifies local spatial patterns and clusters
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Statistical Significance"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Uses Monte Carlo simulation for hypothesis testing
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Cluster Classification"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Categorizes regions into hot spots, cold spots, and outliers
                    </Typography>
                  }
                />
              </ListItem>
            </List>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Significance levels: Highly Significant (p ≤ 0.01), Significant (p ≤ 0.05), 
              Marginally Significant (p ≤ 0.1)
            </Typography>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
};

export default React.memo(SpatialAnalysisPanel);
