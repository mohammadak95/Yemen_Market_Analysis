import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { CLUSTER_TYPES } from './types';

const ClusterMatrix = ({
  clusters,
  local,
  selectedRegion,
  onRegionSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Format values for display
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  // Get cluster color
  const getClusterColor = (type) => {
    switch (type) {
      case 'high-high': return theme.palette.error.main;
      case 'low-low': return theme.palette.primary.main;
      case 'high-low': return theme.palette.warning.main;
      case 'low-high': return theme.palette.info.main;
      default: return theme.palette.grey[400];
    }
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

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 2
      }}
    >
      <Typography variant="h6" align="center" gutterBottom>
        Spatial Cluster Matrix
      </Typography>

      <TableContainer 
        component={Paper} 
        sx={{ 
          flexGrow: 1,
          maxHeight: '100%',
          bgcolor: 'background.default'
        }}
      >
        <Table stickyHeader size={isSmallScreen ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell>Region</TableCell>
              <TableCell align="right">Local Moran&apos;s I</TableCell>
              <TableCell align="right">P-Value</TableCell>
              <TableCell align="right">Z-Score</TableCell>
              <TableCell>Cluster Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(local).map(([region, stats]) => (
              <TableRow
                key={region}
                hover
                selected={region === selectedRegion}
                onClick={() => onRegionSelect(region)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${theme.palette.action.hover} !important`
                  }
                }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant={isSmallScreen ? "body2" : "body1"}>
                    {region}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatValue(stats.local_i)}
                </TableCell>
                <TableCell align="right">
                  {formatValue(stats.p_value)}
                </TableCell>
                <TableCell align="right">
                  {formatValue(stats.z_score)}
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
                        bgcolor: getClusterColor(stats.cluster_type),
                        opacity: 0.7
                      }}
                    />
                    <Typography variant={isSmallScreen ? "body2" : "body1"}>
                      {stats.cluster_type.replace('-', ' ')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Paper 
        sx={{ 
          p: 2,
          bgcolor: 'background.default',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'center'
        }}
      >
        {Object.entries(clusters).map(([type, regions]) => (
          <Box
            key={type}
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
                bgcolor: getClusterColor(type),
                opacity: 0.7
              }}
            />
            <Typography variant="body2">
              {`${type.replace('-', ' ')}: ${regions.length}`}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default React.memo(ClusterMatrix);
