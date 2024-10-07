//src/components/price-differential-analysis/MarketPairInfo.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';

const MarketPairInfo = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No market pair information available.
      </Typography>
    );
  }

  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(4) : 'N/A');

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Market Pair Information
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Conflict Correlation</TableCell>
              <TableCell>{formatNumber(data.conflict_correlation)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Common Dates</TableCell>
              <TableCell>{data.common_dates || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Distance (km)</TableCell>
              <TableCell>{formatNumber(data.distance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>P-Value</TableCell>
              <TableCell>{formatNumber(data.p_value)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Interpretation</TableCell>
              <TableCell>
                {data.p_value < 0.05
                  ? 'The price differential is statistically significant, indicating a strong impact.'
                  : 'The price differential is not statistically significant, suggesting a weak or negligible impact.'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    conflict_correlation: PropTypes.number,
    common_dates: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    distance: PropTypes.number,
    p_value: PropTypes.number,
  }),
};

export default MarketPairInfo;