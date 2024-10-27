// src/components/discovery/exercises/TVMIIExercise.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Slider,
  Grid,
  Paper,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { BlockMath } from 'react-katex';
import { getEquation } from '../../../utils/methodologyRegistry';

const TVMIIExercise = () => {
  const [correlation, setCorrelation] = useState(0.5);
  const [volatility, setVolatility] = useState(1);

  // Simulate TV-MII data
  const generateTVMIIData = () => {
    const time = [...Array(50).keys()];
    const tvmii = time.map((t) => {
      // Simplified calculation
      return correlation * Math.exp(-volatility * t / 50);
    });
    return { time, tvmii };
  };

  const { time, tvmii } = generateTVMIIData();

  // Chart data
  const chartData = {
    labels: time,
    datasets: [
      {
        label: 'TV-MII',
        data: tvmii,
        borderColor: 'rgba(54,162,235,1)',
        fill: false,
      },
    ],
  };

  // Get equation from methodology
  const tvmiiEquation = getEquation('tvmii', 'main');

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time-Varying Market Integration Index Interactive Exercise
      </Typography>

      <Typography variant="body1" paragraph>
        Adjust the correlation and volatility parameters to see how they affect the TV-MII over time.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <BlockMath>{tvmiiEquation.latex}</BlockMath>
        <Typography variant="caption">{tvmiiEquation.description}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography gutterBottom>
            Correlation (ρ): {correlation}
          </Typography>
          <Slider
            value={correlation}
            onChange={(e, val) => setCorrelation(val)}
            min={0}
            max={1}
            step={0.01}
            marks={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
            ]}
          />
          <Typography variant="caption">
            Adjust ρ to simulate the correlation between markets.
          </Typography>

          <Typography gutterBottom sx={{ mt: 2 }}>
            Volatility (σ): {volatility}
          </Typography>
          <Slider
            value={volatility}
            onChange={(e, val) => setVolatility(val)}
            min={0.1}
            max={2}
            step={0.01}
            marks={[
              { value: 0.1, label: '0.1' },
              { value: 2, label: '2' },
            ]}
          />
          <Typography variant="caption">
            Adjust σ to change the volatility over time.
          </Typography>
        </Grid>
        <Grid item xs={12} md={8}>
          <Line data={chartData} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1">
          Observe how increasing correlation leads to higher TV-MII values, indicating stronger market integration. Higher volatility can cause TV-MII to fluctuate more over time.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIExercise.propTypes = {};

export default TVMIIExercise;
