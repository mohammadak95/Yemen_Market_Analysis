// src/components/ecm-analysis/ECMInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ECMInterpretation = ({ analysisResult }) => {
  const coefficientData = [
    { name: 'Alpha (α)', value: analysisResult.alpha },
    { name: 'Beta (β)', value: analysisResult.beta },
    { name: 'Gamma (γ)', value: analysisResult.gamma },
  ];

  const interpretCoefficient = (name, value) => {
    switch (name) {
      case 'Alpha (α)':
        return `The Error Correction Term (α) is ${value < 0 ? 'negative' : 'positive'}, indicating that the system ${value < 0 ? 'adjusts towards' : 'diverges from'} equilibrium after a shock.`;
      case 'Beta (β)':
        return `The long-run relationship coefficient (β) suggests a ${value > 0 ? 'positive' : 'negative'} long-term relationship between the variables.`;
      case 'Gamma (γ)':
        return `The short-term dynamics coefficient (γ) indicates the immediate impact of changes in the independent variable on the dependent variable.`;
      default:
        return '';
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>ECM Coefficient Interpretation</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={coefficientData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        {coefficientData.map(({ name, value }) => (
          <Typography key={name} variant="body2" paragraph>
            <strong>{name}:</strong> {value.toFixed(4)} - {interpretCoefficient(name, value)}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

ECMInterpretation.propTypes = {
  analysisResult: PropTypes.shape({
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
  }).isRequired,
};

export default ECMInterpretation;