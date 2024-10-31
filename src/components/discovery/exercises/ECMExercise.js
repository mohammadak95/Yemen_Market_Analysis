// src/components/discovery/exercises/ECMExercise.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Slider,
  Grid,
  Tooltip,
  Paper,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import { BlockMath } from 'react-katex';
import { getEquation } from '../../../utils/appUtils';

const ECMExercise = () => {
  // Initialize parameters
  const [alpha, setAlpha] = useState(-0.5);
  const [beta, setBeta] = useState(1.0);
  const [gamma, setGamma] = useState(0.5);

  // Simulate ECM data based on parameters
  const generateECMData = () => {
    const time = [...Array(50).keys()];
    let y = [0];
    let x = [0];
    for (let t = 1; t < time.length; t++) {
      const deltaX = Math.random() * 2 - 1; // Random shock to x
      x.push(x[t - 1] + deltaX);
      const equilibriumError = y[t - 1] - beta * x[t - 1];
      const deltaY = alpha * equilibriumError + gamma * deltaX;
      y.push(y[t - 1] + deltaY);
    }
    return { time, y, x };
  };

  const { time, y, x } = generateECMData();

  // Chart data
  const chartData = {
    labels: time,
    datasets: [
      {
        label: 'Dependent Variable (Y)',
        data: y,
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        yAxisID: 'y-axis-1',
      },
      {
        label: 'Independent Variable (X)',
        data: x,
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        yAxisID: 'y-axis-2',
      },
    ],
  };

  // Chart options
  const chartOptions = {
    scales: {
      yAxes: [
        {
          type: 'linear',
          display: true,
          position: 'left',
          id: 'y-axis-1',
        },
        {
          type: 'linear',
          display: true,
          position: 'right',
          id: 'y-axis-2',
          gridLines: {
            drawOnArea: false,
          },
        },
      ],
    },
  };

  // Get equation from methodology
  const ecmEquation = getEquation('ecm', 'main');

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Error Correction Model Interactive Exercise
      </Typography>

      <Typography variant="body1" paragraph>
        Adjust the parameters of the ECM and observe how the dependent variable responds over time. The ECM captures both short-term dynamics and long-term equilibrium relationships.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <BlockMath>
          {`\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma\\Delta x_t + \\epsilon_t`}
        </BlockMath>
        <Typography variant="caption">
          {ecmEquation.description}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography gutterBottom>
            Speed of Adjustment (α): {alpha}
          </Typography>
          <Slider
            value={alpha}
            onChange={(e, val) => setAlpha(val)}
            min={-1}
            max={0}
            step={0.01}
            marks={[
              { value: -1, label: '-1' },
              { value: 0, label: '0' },
            ]}
          />
          <Tooltip title="Controls how quickly deviations from equilibrium are corrected">
            <Typography variant="caption">Adjust α to see its effect on the speed of adjustment.</Typography>
          </Tooltip>

          <Typography gutterBottom sx={{ mt: 2 }}>
            Long-run Equilibrium Coefficient (β): {beta}
          </Typography>
          <Slider
            value={beta}
            onChange={(e, val) => setBeta(val)}
            min={0.5}
            max={1.5}
            step={0.01}
            marks={[
              { value: 0.5, label: '0.5' },
              { value: 1.5, label: '1.5' },
            ]}
          />
          <Tooltip title="Represents the long-term relationship between variables">
            <Typography variant="caption">Adjust β to modify the long-run equilibrium.</Typography>
          </Tooltip>

          <Typography gutterBottom sx={{ mt: 2 }}>
            Short-run Dynamics Coefficient (γ): {gamma}
          </Typography>
          <Slider
            value={gamma}
            onChange={(e, val) => setGamma(val)}
            min={-1}
            max={1}
            step={0.01}
            marks={[
              { value: -1, label: '-1' },
              { value: 1, label: '1' },
            ]}
          />
          <Tooltip title="Captures the immediate impact of changes in the independent variable">
            <Typography variant="caption">Adjust γ to see its effect on short-run dynamics.</Typography>
          </Tooltip>
        </Grid>
        <Grid item xs={12} md={8}>
          <Line data={chartData} options={chartOptions} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1">
          Observe how changes in the parameters affect the adjustment of <em>y<sub>t</sub></em> over time. A more negative α results in faster adjustment towards equilibrium. Adjust β to alter the long-run equilibrium relationship, and γ to see immediate effects of changes in <em>x<sub>t</sub></em>.
        </Typography>
      </Box>
    </Paper>
  );
};

ECMExercise.propTypes = {};

export default ECMExercise;
