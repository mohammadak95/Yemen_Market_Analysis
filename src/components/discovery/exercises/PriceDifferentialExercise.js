// src/components/discovery/exercises/PriceDifferentialExercise.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Paper,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { BlockMath } from 'react-katex';
import { getEquation } from '../../../utils/methodologyRegistry';

const PriceDifferentialExercise = ({ data }) => {
  const [marketA, setMarketA] = useState('Market 1');
  const [marketB, setMarketB] = useState('Market 2');
  const [transportCost, setTransportCost] = useState(0);

  // Sample price data (replace with actual data)
  const sampleData = {
    'Market 1': Array.from({ length: 50 }, () => Math.random() * 10 + 50),
    'Market 2': Array.from({ length: 50 }, () => Math.random() * 10 + 55),
    'Market 3': Array.from({ length: 50 }, () => Math.random() * 10 + 60),
  };

  const time = [...Array(50).keys()];

  // Calculate price differential
  const calculatePriceDiff = () => {
    const pricesA = sampleData[marketA];
    const pricesB = sampleData[marketB];
    return pricesA.map((priceA, index) => {
      const priceB = pricesB[index];
      const diff = Math.log(priceA) - Math.log(priceB) + transportCost;
      return diff;
    });
  };

  const priceDiff = calculatePriceDiff();

  // Chart data
  const chartData = {
    labels: time,
    datasets: [
      {
        label: `Price Differential between ${marketA} and ${marketB}`,
        data: priceDiff,
        borderColor: 'rgba(255,99,132,1)',
        fill: false,
      },
    ],
  };

  // Get equation from methodology
  const priceDiffEquation = getEquation('priceDiff', 'main');

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Price Differential Analysis Interactive Exercise
      </Typography>

      <Typography variant="body1" paragraph>
        Select two markets and adjust the transportation cost to see how the price differential changes over time.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <BlockMath>{priceDiffEquation.latex}</BlockMath>
        <Typography variant="caption">{priceDiffEquation.description}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Market A</InputLabel>
            <Select
              value={marketA}
              onChange={(e) => setMarketA(e.target.value)}
              label="Select Market A"
            >
              {Object.keys(sampleData).map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Market B</InputLabel>
            <Select
              value={marketB}
              onChange={(e) => setMarketB(e.target.value)}
              label="Select Market B"
            >
              {Object.keys(sampleData).map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography gutterBottom>
            Transportation Cost (τ): {transportCost}
          </Typography>
          <Slider
            value={transportCost}
            onChange={(e, val) => setTransportCost(val)}
            min={-5}
            max={5}
            step={0.1}
            marks={[
              { value: -5, label: '-5' },
              { value: 0, label: '0' },
              { value: 5, label: '5' },
            ]}
          />
          <Typography variant="caption">
            Adjust τ to simulate the effect of transportation costs or tariffs.
          </Typography>
        </Grid>
        <Grid item xs={12} md={8}>
          <Line data={chartData} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1">
          Analyze how the price differential responds to changes in transportation costs and market selection. Observe the convergence or divergence in prices between markets.
        </Typography>
      </Box>
    </Paper>
  );
};

PriceDifferentialExercise.propTypes = {
  data: PropTypes.object, // Replace with actual data prop if needed
};

export default PriceDifferentialExercise;
