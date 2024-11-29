//src/components/analysis/spatial-analysis/components/clusters/ClusterComparisonTable.js

import React, { useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Chip,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const EfficiencyCell = ({ value }) => {
  const theme = useTheme();
  
  const { color, label, icon } = useMemo(() => {
    if (value >= 0.7) return { 
      color: 'success', 
      label: 'High',
      icon: <TrendingUpIcon fontSize="small" sx={{ ml: 0.5, color: 'success.main' }} />
    };
    if (value >= 0.4) return { 
      color: 'warning', 
      label: 'Medium',
      icon: null
    };
    return { 
      color: 'error', 
      label: 'Low',
      icon: <TrendingDownIcon fontSize="small" sx={{ ml: 0.5, color: 'error.main' }} />
    };
  }, [value, theme]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2">
          {(value * 100).toFixed(1)}%
        </Typography>
        {icon}
        <Chip 
          label={label} 
          size="small" 
          color={color}
          sx={{ ml: 'auto', height: 20, fontSize: '0.75rem' }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={value * 100}
        color={color}
        sx={{ 
          height: 4, 
          borderRadius: 2,
          bgcolor: theme.palette.grey[200]
        }}
      />
    </Box>
  );
};

const MarketCell = ({ main_market, markets }) => (
  <Box>
    <Typography variant="body2" gutterBottom>
      <strong>{main_market}</strong>
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {markets.map(market => (
        <Chip
          key={market}
          label={market}
          size="small"
          variant={market === main_market ? "filled" : "outlined"}
          sx={{ 
            height: 20,
            fontSize: '0.75rem'
          }}
        />
      ))}
    </Box>
  </Box>
);

const InfoHeader = ({ title, description }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    {title}
    <Tooltip title={description}>
      <IconButton size="small">
        <InfoIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const ClusterComparisonTable = ({ 
  clusters = [], 
  selectedClusterId,
  onClusterSelect 
}) => {
  const theme = useTheme();

  const rows = useMemo(() => {
    if (!Array.isArray(clusters)) return [];
    
    return clusters.map((cluster) => {
      if (!cluster) return null;
      
      const markets = cluster.markets || [];
      const metrics = cluster.metrics || {};

      return {
        id: cluster.cluster_id || Math.random().toString(36).substr(2, 9),
        cluster_id: cluster.cluster_id || 'N/A',
        main_market: cluster.main_market || 'Unknown',
        markets: markets,
        market_count: markets.length,
        efficiency_score: metrics.efficiency || 0,
        internal_connectivity: metrics.internal_connectivity || 0,
        price_convergence: metrics.price_convergence || 0,
        stability: metrics.stability || 0,
        coverage: metrics.coverage || 0
      };
    }).filter(Boolean);
  }, [clusters]);

  const columns = [
    { 
      field: 'main_market', 
      headerName: 'Markets', 
      width: 250,
      renderHeader: () => (
        <InfoHeader
          title="Markets"
          description="Connected markets in the cluster"
        />
      ),
      renderCell: (params) => (
        <MarketCell 
          main_market={params.row.main_market}
          markets={params.row.markets}
        />
      )
    },
    {
      field: 'market_count',
      headerName: 'Count',
      width: 80,
      type: 'number',
      renderHeader: () => (
        <InfoHeader
          title="Count"
          description="Number of markets in the cluster"
        />
      ),
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value} markets
        </Typography>
      )
    },
    {
      field: 'efficiency_score',
      headerName: 'Efficiency',
      width: 180,
      renderHeader: () => (
        <InfoHeader
          title="Efficiency"
          description="Overall cluster efficiency score"
        />
      ),
      renderCell: (params) => (
        <EfficiencyCell value={params.value} />
      ),
      sortComparator: (v1, v2) => v1 - v2
    },
    {
      field: 'internal_connectivity',
      headerName: 'Connectivity',
      width: 180,
      renderHeader: () => (
        <InfoHeader
          title="Connectivity"
          description="Internal market connection density"
        />
      ),
      renderCell: (params) => (
        <EfficiencyCell value={params.value} />
      ),
      sortComparator: (v1, v2) => v1 - v2
    },
    {
      field: 'price_convergence',
      headerName: 'Price Conv.',
      width: 180,
      renderHeader: () => (
        <InfoHeader
          title="Price Conv."
          description="Price uniformity across markets"
        />
      ),
      renderCell: (params) => (
        <EfficiencyCell value={params.value} />
      ),
      sortComparator: (v1, v2) => v1 - v2
    },
    {
      field: 'stability',
      headerName: 'Stability',
      width: 180,
      renderHeader: () => (
        <InfoHeader
          title="Stability"
          description="Market stability over time"
        />
      ),
      renderCell: (params) => (
        <EfficiencyCell value={params.value} />
      ),
      sortComparator: (v1, v2) => v1 - v2
    }
  ];

  if (!rows.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No cluster data available
        </Typography>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: '0 !important' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5, 10, 20]}
          autoHeight
          disableSelectionOnClick
          onRowClick={(params) => onClusterSelect?.(params.row.cluster_id)}
          getRowClassName={(params) => 
            params.row.cluster_id === selectedClusterId ? 'selected-row' : ''
          }
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderColor: theme.palette.divider,
              '&:focus': {
                outline: 'none'
              }
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.action.hover,
              borderBottom: `1px solid ${theme.palette.divider}`
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: theme.palette.action.hover
              },
            '&.selected-row': {
              backgroundColor: theme.palette.action.selected,
              '&:hover': {
                backgroundColor: theme.palette.action.selected
              }
            }
          }
        }}
        components={{
          NoRowsOverlay: () => (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 2
            }}>
              <Typography color="text.secondary">
                No cluster data available
              </Typography>
            </Box>
          ),
          NoResultsOverlay: () => (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 2
            }}>
              <Typography color="text.secondary">
                No matching clusters found
              </Typography>
            </Box>
          )
        }}
      />
    </CardContent>
  </Card>
  );
};

export default React.memo(ClusterComparisonTable);