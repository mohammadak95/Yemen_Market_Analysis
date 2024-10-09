// src/components/ecm-analysis/ECMDiagram.js

import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const ECMDiagram = () => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
        The Error Correction Model (ECM) captures both short-term dynamics and long-term equilibrium without requiring the variables to be stationary. The diagram illustrates how deviations from equilibrium are corrected over time.
      </Typography>
    </CardContent>
  </Card>
);

export default ECMDiagram;
