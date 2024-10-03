import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ECMAnalysis = () => {
  const { data, loading, error } = useDataLoading('ecm/ecm_analysis_results.json');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  // Render your ECM analysis component here using the data
  return (
    <div>
      <h2>ECM Analysis</h2>
      {/* Add your ECM analysis visualization components here */}
    </div>
  );
};

export default ECMAnalysis;