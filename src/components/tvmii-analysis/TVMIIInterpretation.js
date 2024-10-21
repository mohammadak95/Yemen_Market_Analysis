// src/components/tvmii-analysis/TVMIIInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Box } from '@mui/material';

const TVMIIInterpretation = ({ data, marketPairsData, selectedCommodity }) => {
  const interpretTVMII = () => {
    const avgTVMII = data.reduce((sum, item) => sum + item.tv_mii, 0) / data.length;
    const latestTVMII = data[data.length - 1].tv_mii;
    const trend = latestTVMII > avgTVMII ? 'increasing' : 'decreasing';

    return `The average TV-MII for ${selectedCommodity} is ${avgTVMII.toFixed(3)}. 
    The most recent TV-MII value is ${latestTVMII.toFixed(3)}, indicating a ${trend} trend in market integration.`;
  };

  const interpretMarketPairs = () => {
    const pairAverages = marketPairsData.reduce((acc, item) => {
      if (!acc[item.market_pair]) {
        acc[item.market_pair] = { sum: 0, count: 0 };
      }
      acc[item.market_pair].sum += item.tv_mii;
      acc[item.market_pair].count += 1;
      return acc;
    }, {});

    const averages = Object.entries(pairAverages).map(([pair, { sum, count }]) => ({
      pair,
      average: sum / count
    }));

    averages.sort((a, b) => b.average - a.average);

    const topPair = averages[0];
    const bottomPair = averages[averages.length - 1];

    return `The market pair with the highest average TV-MII is ${topPair.pair} (${topPair.average.toFixed(3)}), 
    indicating strong integration. The pair with the lowest average TV-MII is ${bottomPair.pair} (${bottomPair.average.toFixed(3)}), 
    suggesting weaker integration.`;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        TV-MII Interpretation for {selectedCommodity}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" paragraph>
          {interpretTVMII()}
        </Typography>
        <Typography variant="body1" paragraph>
          {interpretMarketPairs()}
        </Typography>
        <Typography variant="body1">
          These interpretations provide insights into the overall market integration trends for {selectedCommodity} 
          and highlight differences in integration levels between market pairs. Consider external factors such as 
          conflict events, policy changes, or seasonal patterns that might explain these observations.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIInterpretation.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    tv_mii: PropTypes.number.isRequired,
  })).isRequired,
  marketPairsData: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    tv_mii: PropTypes.number.isRequired,
    market_pair: PropTypes.string.isRequired,
  })).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
};

export default TVMIIInterpretation;