// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import MapComponent from './MapComponent';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorMessage from '../../common/ErrorMessage';
import { setSelectedRegion } from '../../../slices/spatialSlice';

const SpatialAnalysis = ({ spatialViewConfig, onSpatialViewChange }) => {
  // Access data from Redux store
  const dispatch = useDispatch();
  const spatialData = useSelector((state) => state.spatial.data);
  const loading = useSelector((state) => state.spatial.status.loading);
  const error = useSelector((state) => state.spatial.status.error);
  const selectedRegion = useSelector((state) => state.spatial.ui.selectedRegion);

  // Destructure necessary data
  const { geoJSON, marketClusters, flowMaps } = spatialData || {};

  // Handle loading and error states
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Error loading spatial data: ${error}`} />;
  }

  // Memoize the data to avoid unnecessary re-renders
  const memoizedGeoJSON = useMemo(() => geoJSON, [geoJSON]);
  const memoizedMarketClusters = useMemo(() => marketClusters, [marketClusters]);
  const memoizedFlowMaps = useMemo(() => flowMaps, [flowMaps]);

  // Handle region selection (if applicable)
  const handleRegionClick = (regionId) => {
    dispatch(setSelectedRegion(regionId));
  };

  // Pass data and view config to MapComponent
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapComponent
        geoJSON={memoizedGeoJSON}
        marketClusters={memoizedMarketClusters}
        flowMaps={memoizedFlowMaps}
        spatialViewConfig={spatialViewConfig}
        onSpatialViewChange={onSpatialViewChange}
        onRegionClick={handleRegionClick}
        selectedRegion={selectedRegion}
      />
    </div>
  );
};

SpatialAnalysis.propTypes = {
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }).isRequired,
  onSpatialViewChange: PropTypes.func.isRequired,
};

export default SpatialAnalysis;