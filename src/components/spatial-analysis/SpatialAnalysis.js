// src/components/spatial-analysis/SpatialAnalysis.js
import React from 'react';
import useDataLoading from '../../hooks/useDataLoading';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import Map from '../common/Map';

const SpatialAnalysis = () => {
  const { data: spatialResults, loading: loadingSpatial, error: errorSpatial } = useDataLoading('spatial_analysis_results.json');
  const { data: spatialWeights, loading: loadingWeights, error: errorWeights } = useDataLoading('spatial_weights/spatial_weights.json');

  if (loadingSpatial || loadingWeights) return <LoadingSpinner />;
  if (errorSpatial) return <ErrorMessage message={errorSpatial.message} />;
  if (errorWeights) return <ErrorMessage message={errorWeights.message} />;

  return (
    <div>
      <h2>Spatial Analysis</h2>
      <Map spatialResults={spatialResults} spatialWeights={spatialWeights} />
      {/* Additional visualization components */}
    </div>
  );
};

export default SpatialAnalysis;