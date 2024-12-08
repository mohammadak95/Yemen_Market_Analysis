import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
  Button,
  Collapse,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { CLUSTER_COLORS, CLUSTER_TYPES, SIGNIFICANCE_LEVELS } from './types';

const ClusterMatrix = ({
  clusters,
  local,
  selectedRegion,
  onRegionSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [orderBy, setOrderBy] = useState('local_i');
  const [order, setOrder] = useState('desc');
  const [showMethodology, setShowMethodology] = useState(false);

  // Enhanced data processing with statistical measures
  const processedData = useMemo(() => {
    if (!local) return { rows: [], summary: {} };

    const rows = Object.entries(local).map(([region, stats]) => {
      const clusterStrength = Math.abs(stats.local_i) * 
        (stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 1 : 0.5);
      
      const significanceLevel = 
        stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 'Highly Significant' :
        stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 'Significant' :
        stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 'Marginally Significant' :
        'Not Significant';

      const confidenceInterval = stats.variance ? {
        lower: stats.local_i - 1.96 * Math.sqrt(stats.variance),
        upper: stats.local_i + 1.96 * Math.sqrt(stats.variance)
      } : null;

      return {
        region,
        ...stats,
        clusterStrength,
        significanceLevel,
        confidenceInterval
      };
    });

    // Calculate summary statistics
    const summary = {
      totalRegions: rows.length,
      significantClusters: rows.filter(r => r.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT).length,
      averageStrength: rows.reduce((sum, r) => sum + r.clusterStrength, 0) / rows.length,
      clusterCounts: Object.fromEntries(
        Object.values(CLUSTER_TYPES).map(type => [
          type,
          rows.filter(r => r.cluster_type === type).length
        ])
      ),
      significanceLevels: {
        highlySignificant: rows.filter(r => r.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT).length,
        significant: rows.filter(r => 
          r.p_value > SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT && 
          r.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT
        ).length,
        marginal: rows.filter(r => 
          r.p_value > SIGNIFICANCE_LEVELS.SIGNIFICANT && 
          r.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT
        ).length
      }
    };

    return { rows, summary };
  }, [local]);

  // Sorting function
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Format values for display with enhanced precision
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  if (!clusters || !local) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <Typography color="textSecondary">
          No cluster data available
        </Typography>
      </Box>
    );
  }

  // Sort data
  const sortedData = [...processedData.rows].sort((a, b) => {
    const multiplier = order === 'asc' ? 1 : -1;
    if (orderBy === 'region') {
      return multiplier * a.region.localeCompare(b.region);
    }
    return multiplier * ((a[orderBy] || 0) - (b[orderBy] || 0));
  });

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 2,
        position: 'relative'
      }}
    >
      {/* Instructions Banner */}
      <Paper
        elevation={1}
        sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          maxWidth: '90%',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Click on any row to view detailed market cluster analysis
        </Typography>
      </Paper>

      {/* Enhanced Header with Summary Statistics */}
      <Card sx={{ mb: 2, mt: 4, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" align="center" gutterBottom>
            Market Cluster Analysis
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center',
              mb: 2
            }}
          >
            <Tooltip title="Regions with significant spatial association">
              <Chip
                label={`${processedData.summary.significantClusters} Significant Clusters`}
                color="primary"
                variant="outlined"
              />
            </Tooltip>
            <Tooltip title="Average cluster strength across all regions">
              <Chip
                label={`Avg Strength: ${formatValue(processedData.summary.averageStrength)}`}
                color="secondary"
                variant="outlined"
              />
            </Tooltip>
            <Tooltip title="Highly significant spatial patterns">
              <Chip
                label={`${processedData.summary.significanceLevels.highlySignificant} Highly Significant`}
                color="success"
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      <TableContainer 
        component={Paper} 
        sx={{ 
          flexGrow: 1,
          maxHeight: '100%',
          bgcolor: 'background.default',
          boxShadow: 2,
          '& .MuiTableRow-hover:hover': {
            backgroundColor: theme.palette.action.hover,
            transition: 'background-color 0.2s ease'
          },
          '& .Mui-selected': {
            backgroundColor: `${theme.palette.primary.main}15 !important`
          }
        }}
      >
        <Table stickyHeader size={isSmallScreen ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'region'}
                  direction={orderBy === 'region' ? order : 'asc'}
                  onClick={() => handleSort('region')}
                >
                  <Tooltip title="Market region name">
                    <span>Region</span>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'local_i'}
                  direction={orderBy === 'local_i' ? order : 'asc'}
                  onClick={() => handleSort('local_i')}
                >
                  <Tooltip title="Local spatial autocorrelation measure">
                    <span>Local Moran&apos;s I</span>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'p_value'}
                  direction={orderBy === 'p_value' ? order : 'asc'}
                  onClick={() => handleSort('p_value')}
                >
                  <Tooltip title="Statistical significance level">
                    <span>Significance</span>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'clusterStrength'}
                  direction={orderBy === 'clusterStrength' ? order : 'asc'}
                  onClick={() => handleSort('clusterStrength')}
                >
                  <Tooltip title="Normalized cluster strength indicator">
                    <span>Strength</span>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Tooltip title="Type of spatial pattern">
                  <span>Pattern</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow
                key={row.region}
                hover
                selected={row.region === selectedRegion}
                onClick={() => onRegionSelect(row.region)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${theme.palette.action.hover} !important`
                  }
                }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant={isSmallScreen ? "body2" : "body1"}>
                    {row.region}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={row.confidenceInterval ? 
                    `95% CI: [${formatValue(row.confidenceInterval.lower)}, ${formatValue(row.confidenceInterval.upper)}]` : 
                    'Confidence interval not available'
                  }>
                    <span>{formatValue(row.local_i)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`p-value: ${formatValue(row.p_value)}`}>
                    <Box>
                      <Chip
                        label={row.significanceLevel}
                        size="small"
                        color={
                          row.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? "success" :
                          row.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? "primary" :
                          row.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? "warning" :
                          "default"
                        }
                        sx={{ fontSize: isSmallScreen ? '0.7rem' : '0.8rem' }}
                      />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`Z-score: ${formatValue(row.z_score)}`}>
                    <span>{formatValue(row.clusterStrength)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: CLUSTER_COLORS[row.cluster_type],
                        opacity: row.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 0.8 : 0.4,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    />
                    <Typography variant={isSmallScreen ? "body2" : "body1"}>
                      {row.cluster_type.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join('-')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Enhanced Summary */}
      <Card sx={{ p: 2, bgcolor: 'background.default', boxShadow: 2 }}>
        <Typography variant="subtitle2" gutterBottom align="center">
          Cluster Distribution
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'center'
          }}
        >
          {Object.entries(processedData.summary.clusterCounts).map(([type, count]) => (
            <Tooltip
              key={type}
              title={`${count} regions (${((count/processedData.summary.totalRegions)*100).toFixed(1)}%)`}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: CLUSTER_COLORS[type],
                    opacity: 0.8,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                />
                <Typography variant="body2">
                  {`${type.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join('-')}: ${count}`}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Card>

      {/* Methodology Section */}
      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          onClick={() => setShowMethodology(!showMethodology)}
          endIcon={showMethodology ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          startIcon={<InfoOutlinedIcon />}
          sx={{ mb: 1 }}
        >
          Market Cluster Analysis Methodology
        </Button>
        <Collapse in={showMethodology}>
          <Paper sx={{ p: 2, boxShadow: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Understanding Market Cluster Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              Market clusters are identified using Local Indicators of Spatial Association (LISA) 
              to detect statistically significant spatial patterns in market behavior:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="High-High Clusters (Hot Spots)"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Markets with high values surrounded by other high-value markets, 
                      indicating concentrated market activity
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Low-Low Clusters (Cold Spots)"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Markets with low values surrounded by other low-value markets, 
                      suggesting potential market barriers
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="High-Low & Low-High (Outliers)"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Markets that differ significantly from their neighbors, 
                      indicating potential market anomalies
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Cluster Strength"
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Measures the intensity of spatial association, weighted by statistical significance
                    </Typography>
                  }
                />
              </ListItem>
            </List>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Statistical significance is determined using Monte Carlo simulation with three levels:
              Highly Significant (p ≤ 0.01), Significant (p ≤ 0.05), and Marginally Significant (p ≤ 0.1)
            </Typography>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
};

export default React.memo(ClusterMatrix);
