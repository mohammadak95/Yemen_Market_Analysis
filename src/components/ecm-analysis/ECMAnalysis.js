import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ECMAnalysis = () => {
  const { data, loading, error } = useDataLoading('ecm-data.json');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <h2>ECM Analysis</h2>
      {/* Render your ECM analysis components here using the 'data' */}
    </div>
  );
};

export default ECMAnalysis;