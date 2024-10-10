// src/components/interactive_graph/InteractiveChart.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const InteractiveChart = ({ data, selectedCommodity, selectedRegimes }) => {
  // Verify the data received
  console.log('InteractiveChart data:', data);
  if (data.length > 0) {
    data.slice(0, 5).forEach((item, index) => {
      console.log(`InteractiveChart Feature ${index} - Date Type:`, typeof item.date);
    });
  }

  // Define colors for different regimes
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        {selectedRegimes.map((regime, index) => (
          <Line
            key={regime}
            type="monotone"
            dataKey={`price_${regime}`} // Ensure this matches your data keys
            stroke={colors[index % colors.length]}
            activeDot={{ r: 8 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

InteractiveChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired, // Should be a string after processing
      // Include other relevant fields as needed
      // Example:
      // price_unified: PropTypes.number,
      // price_north: PropTypes.number,
      // price_south: PropTypes.number,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InteractiveChart;
