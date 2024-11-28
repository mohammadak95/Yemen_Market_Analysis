import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

// Utility function to safely get nested object values
const safeGet = (obj, path) => {
  try {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  } catch (e) {
    return undefined;
  }
};

const ClusterComparisonTable = ({ clusters = [] }) => {
  const columns = [
    { 
      field: 'cluster_id', 
      headerName: 'Cluster ID', 
      width: 100,
      valueGetter: (params) => {
        if (!params?.row) return 'N/A';
        return params.row.cluster_id || 'N/A';
      }
    },
    { 
      field: 'main_market', 
      headerName: 'Main Market', 
      width: 150,
      valueGetter: (params) => {
        if (!params?.row) return 'Unknown';
        return params.row.main_market || 'Unknown';
      }
    },
    {
      field: 'efficiency_score',
      headerName: 'Efficiency Score',
      width: 150,
      valueFormatter: (params) => {
        if (!params?.value && params?.value !== 0) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'internal_connectivity',
      headerName: 'Internal Connectivity',
      width: 180,
      valueFormatter: (params) => {
        if (!params?.value && params?.value !== 0) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'market_coverage',
      headerName: 'Market Coverage',
      width: 150,
      valueFormatter: (params) => {
        if (!params?.value && params?.value !== 0) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'price_convergence',
      headerName: 'Price Convergence',
      width: 160,
      valueFormatter: (params) => {
        if (!params?.value && params?.value !== 0) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'stability',
      headerName: 'Stability',
      width: 120,
      valueFormatter: (params) => {
        if (!params?.value && params?.value !== 0) return 'N/A';
        return `${(params.value * 100).toFixed(1)}%`;
      },
      sortComparator: (v1, v2) => (v1 || 0) - (v2 || 0)
    },
    {
      field: 'market_count',
      headerName: 'Markets',
      width: 100,
      type: 'number',
      valueGetter: (params) => {
        if (!params?.row) return 0;
        return params.row.market_count || 0;
      }
    }
  ];

  const rows = React.useMemo(() => {
    if (!Array.isArray(clusters)) return [];
    
    return clusters.map((cluster) => {
      if (!cluster) return null;
      
      return {
        id: cluster.cluster_id || Math.random().toString(36).substr(2, 9),
        cluster_id: cluster.cluster_id,
        main_market: cluster.main_market,
        efficiency_score: safeGet(cluster, 'metrics.efficiency'),
        internal_connectivity: safeGet(cluster, 'metrics.internal_connectivity'),
        market_coverage: safeGet(cluster, 'metrics.coverage'),
        price_convergence: safeGet(cluster, 'metrics.price_convergence'),
        stability: safeGet(cluster, 'metrics.stability'),
        market_count: Array.isArray(cluster.markets) ? 
          cluster.markets.length : 
          Array.isArray(cluster.connected_markets) ? 
            cluster.connected_markets.length : 0
      };
    }).filter(Boolean);
  }, [clusters]);

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        columns={columns}
        rows={rows}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
        loading={!clusters?.length}
        components={{
          NoRowsOverlay: () => (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%' 
            }}>
              No cluster data available
            </div>
          )
        }}
      />
    </div>
  );
};

export default ClusterComparisonTable;
