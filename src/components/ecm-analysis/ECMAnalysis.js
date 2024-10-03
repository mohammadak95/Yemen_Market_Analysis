// src/components/ecm-analysis/ECMAnalysis.js
import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import LineChart from '../common/LineChart';

const ECMAnalysis = () => {
  const { data, loading, error } = useDataLoading('ecm/ecm_analysis_results.json');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <h2>Error Correction Model Analysis</h2>
      <LineChart data={data} />
      {/* Additional visualization components */}
    </div>
  );
};

export default ECMAnalysis;