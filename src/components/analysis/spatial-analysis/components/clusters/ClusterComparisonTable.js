// src/components/analysis/spatial-analysis/components/clusters/ClusterComparisonTable.js

import React from 'react';
import PropTypes from 'prop-types';
import { DataGrid } from '@mui/x-data-grid';

const ClusterComparisonTable = ({ clusters }) => {
  const safeNumberFormat = (value) => {
    if (value === null || value === undefined) return '';
    return Number(value).toFixed(2);
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
    id: cluster.cluster_id,
    cluster_id: cluster.cluster_id,
    main_market: cluster.main_market,
    efficiency_score: cluster.efficiency_metrics?.efficiency_score,
    internal_connectivity: cluster.efficiency_metrics?.internal_connectivity,
    market_coverage: cluster.efficiency_metrics?.market_coverage,
    price_convergence: cluster.efficiency_metrics?.price_convergence,
    stability: cluster.efficiency_metrics?.stability,
    market_count: cluster.connected_markets?.length || 0,
  }));

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        columns={columns}
        rows={rows}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
      />
    </div>
  );
};

ClusterComparisonTable.propTypes = {
  clusters: PropTypes.array.isRequired,
};

export default ClusterComparisonTable;
