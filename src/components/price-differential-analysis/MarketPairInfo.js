// src/components/price-differential-analysis/MarketPairInfo.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Box } from '@mui/material';
import ResultTable from '../common/ResultTable';

const MarketPairInfo = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">No market pair information available.</Typography>
    );
  }

  const marketInfoData = [
    {
      name: 'Base Market',
      value: data.base_market || 'N/A',
    },
    {
      name: 'Comparison Market',
      value: data.other_market || 'N/A',
    },
    {
      name: 'Commodity',
      value: data.commodity || 'N/A',
    },
    {
      name: 'Distance',
      value:
        data.diagnostics.distance_km != null
          ? `${(data.diagnostics.distance_km * 200).toFixed(2)} km`
          : 'N/A',
    },
    {
      name: 'Common Dates',
      value: data.diagnostics.common_dates != null ? data.diagnostics.common_dates : 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  const interpretMarketPair = () => {
    let interpretation = '';

    if (data.diagnostics?.distance_km != null) {
      const distanceKm = (data.diagnostics.distance_km * 200).toFixed(2);
      interpretation += `The distance between ${data.base_market} and ${data.other_market} is approximately ${distanceKm} km. This distance may influence the price differential due to transportation costs and market integration.\n\n`;
    }

    if (data.diagnostics?.common_dates != null) {
      interpretation += `The analysis is based on ${data.diagnostics.common_dates} common dates, providing a robust dataset for comparison.`;
    }

    return interpretation;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <ResultTable title="Market Pair Information" data={marketInfoData} columns={columns} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Interpretation</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {interpretMarketPair()}
        </Typography>
      </Box>
    </Paper>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    base_market: PropTypes.string,
    other_market: PropTypes.string,
    commodity: PropTypes.string,
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      common_dates: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
};

export default MarketPairInfo;
