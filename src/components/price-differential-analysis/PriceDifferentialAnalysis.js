// src/components/price-differential-analysis/PriceDifferentialAnalysis.js
import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import BarChart from '../common/BarChart';

const PriceDifferentialAnalysis = () => {
  const { data, loading, error } = useDataLoading('price_diff_results/price_differential_results.json');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <h2>Price Differential Analysis</h2>
      <BarChart data={data} />
      {/* Additional visualization components */}
    </div>
  );
};

export default PriceDifferentialAnalysis;