// src/components/analysis/spatial-analysis/components/clusters/ClusterComparisonTable.js

import React from 'react';
import PropTypes from 'prop-types';
import { DataGrid } from '@mui/x-data-grid';

const ClusterComparisonTable = ({ clusters }) => {
  const safeNumberFormat = (value) => {
    if (value === null || value === undefined) return '';
    return Number(value).toFixed(2);
  };

  const safeGet = (obj, path, defaultValue = '') => {
    try {
      return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const columns = [
    { field: 'cluster_id', headerName: 'Cluster ID', width: 100 },
    { field: 'main_market', headerName: 'Main Market', width: 150 },
    {
      field: 'efficiency_score',
      headerName: 'Efficiency Score',
      width: 150,
      valueFormatter: (params) => safeNumberFormat(params.value),
    },
    {
      field: 'internal_connectivity',
      headerName: 'Connectivity',
      width: 130,
      valueFormatter: (params) => safeNumberFormat(params.value),
    },
    {
      field: 'market_coverage',
      headerName: 'Coverage',
      width: 130,
      valueFormatter: (params) => safeNumberFormat(params.value),
    },
    {
      field: 'price_convergence',
      headerName: 'Price Convergence',
      width: 150,
      valueFormatter: (params) => safeNumberFormat(params.value),
    },
    {
      field: 'stability',
      headerName: 'Stability',
      width: 130,
      valueFormatter: (params) => safeNumberFormat(params.value),
    },
    {
      field: 'market_count',
      headerName: 'Number of Markets',
      width: 150,
    },
  ];

  const rows = clusters.map((cluster) => ({
    id: cluster.cluster_id || Math.random().toString(36).substr(2, 9),
    cluster_id: cluster.cluster_id || '',
    main_market: cluster.main_market || '',
    efficiency_score: safeGet(cluster, 'efficiency_metrics.efficiency_score'),
    internal_connectivity: safeGet(cluster, 'efficiency_metrics.internal_connectivity'),
    market_coverage: safeGet(cluster, 'efficiency_metrics.market_coverage'),
    price_convergence: safeGet(cluster, 'efficiency_metrics.price_convergence'),
    stability: safeGet(cluster, 'efficiency_metrics.stability'),
    market_count: cluster.connected_markets?.length || 0,
  }));

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        columns={columns}
        rows={rows}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
      />
    </div>
  );
};

ClusterComparisonTable.propTypes = {
  clusters: PropTypes.arrayOf(PropTypes.shape({
    cluster_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    main_market: PropTypes.string,
    efficiency_metrics: PropTypes.shape({
      efficiency_score: PropTypes.number,
      internal_connectivity: PropTypes.number,
      market_coverage: PropTypes.number,
      price_convergence: PropTypes.number,
      stability: PropTypes.number,
    }),
    connected_markets: PropTypes.array,
  })).isRequired,
};

export default ClusterComparisonTable;
