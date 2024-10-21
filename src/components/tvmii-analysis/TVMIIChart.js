import React from 'react';
import PropTypes from 'prop-types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Typography, Paper, Box } from '@mui/material';

const TVMIIChart = ({ data, selectedCommodity }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        TV-MII Over Time: {selectedCommodity}
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="tv_mii" stroke="#8884d8" name="TV-MII" />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          This chart displays the Time-Variant Market Integration Index (TV-MII) for {selectedCommodity} over time. 
          Higher values indicate stronger market integration, while lower values suggest weaker integration.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    tv_mii: PropTypes.number.isRequired,
  })).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default TVMIIChart;