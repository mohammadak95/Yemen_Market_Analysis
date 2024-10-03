import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import LineChart from '../common/LineChart';

const PriceDifferentialAnalysis = () => {
  const { data, loading, error } = useDataLoading('price_diff_results/price_differential_results.json');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <h2>Price Differential Analysis</h2>
      {data && <LineChart data={data} />}
      {/* Add more visualization components as needed */}
    </div>
  );
};

export default PriceDifferentialAnalysis;