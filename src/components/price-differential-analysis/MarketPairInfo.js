// src/components/price-differential-analysis/MarketPairInfo.js

import React from 'react';
import PropTypes from 'prop-types';
import Interpretation from '../common/Interpretation';
import ResultTable from '../common/ResultTable';
import { Typography } from '@mui/material';

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
      name: 'Distance',
      value: data.distance ? `${data.distance.toFixed(2)} km` : 'N/A',
    },
    {
      name: 'Common Dates',
      value: data.common_dates || 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  const interpretationMessages = [];

  if (data.p_value !== undefined) {
    const significanceMessage =
      data.p_value < 0.05
        ? 'The price differential is statistically significant, indicating a strong impact.'
        : 'The price differential is not statistically significant, suggesting a weak or negligible impact.';
    interpretationMessages.push(significanceMessage);
  }

  if (data.conflict_correlation !== undefined) {
    const correlationMessage = `The conflict correlation between the markets is ${
      data.conflict_correlation > 0 ? 'positive' : 'negative'
    } (${data.conflict_correlation.toFixed(4)}).`;
    interpretationMessages.push(correlationMessage);
  }

  return (
    <>
      <ResultTable title="Market Pair Information" data={marketInfoData} columns={columns} />
      <Interpretation title="Interpretation" messages={interpretationMessages} />
    </>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    base_market: PropTypes.string,
    other_market: PropTypes.string,
    distance: PropTypes.number,
    common_dates: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    p_value: PropTypes.number,
    conflict_correlation: PropTypes.number,
  }),
};

export default MarketPairInfo;