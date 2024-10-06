// src/components/ecm-analysis/ECMAnalysis.js

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ECMAnalysis = () => {
  const [ecmData, setEcmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchECMData = async () => {
      try {
        const response = await fetch('/results/ecm/ecm_analysis_results.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEcmData(data);
      } catch (err) {
        console.error('Error fetching ECM data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchECMData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="h5" gutterBottom>
        ECM Analysis
      </Typography>
      {/* Render your ECM analysis data here */}
      {/* Example: */}
      <pre>{JSON.stringify(ecmData, null, 2)}</pre>
    </Box>
  );
};

export default ECMAnalysis;