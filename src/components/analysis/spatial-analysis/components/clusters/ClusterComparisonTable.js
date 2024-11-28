import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';

const ClusterComparisonTable = ({ clusters = [] }) => {
  // Memoize rows to prevent unnecessary recalculations
  const rows = React.useMemo(() => {
    if (!Array.isArray(clusters)) return [];
    
    return clusters.map((cluster) => {
      if (!cluster) return null;
      
      const marketCount = cluster.market_count || 0;
      const metrics = cluster.metrics || {};

      return {
        id: cluster.cluster_id || Math.random().toString(36).substr(2, 9),
        cluster_id: cluster.cluster_id || 'N/A',
        main_market: cluster.main_market || 'Unknown',
        market_count: marketCount,
        markets: (cluster.markets || []).map(m => m.name).join(', '),
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
      field: 'cluster_id', 
      headerName: 'Cluster ID', 
      width: 100,
      valueGetter: (params) => params.row?.cluster_id || 'N/A'
    },
    { 
      field: 'main_market', 
      headerName: 'Main Market', 
      width: 150,
      valueGetter: (params) => params.row?.main_market || 'Unknown'
    },
    {
      field: 'market_count',
      headerName: 'Markets',
      width: 100,
      type: 'number'
    },
    {
      field: 'efficiency_score',
      headerName: 'Efficiency',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === undefined || params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'internal_connectivity',
      headerName: 'Connectivity',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === undefined || params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'price_convergence',
      headerName: 'Price Conv.',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === undefined || params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'stability',
      headerName: 'Stability',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === undefined || params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'coverage',
      headerName: 'Coverage',
      width: 120,
      valueFormatter: (params) => {
        if (params.value === undefined || params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'markets',
      headerName: 'Connected Markets',
      width: 300,
      sortable: false
    }
  ];

  // Show empty state if no data
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
    <Box sx={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell': {
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }
        }}
      />
    </Box>
  );
};

export default ClusterComparisonTable;
