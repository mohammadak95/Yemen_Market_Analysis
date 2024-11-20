// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import MapComponent from './MapComponent';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorMessage from '../../common/ErrorMessage';
import { setSelectedRegion, fetchRegressionAnalysis } from '../../../slices/spatialSlice';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { selectGeoJSON, selectLoadingStatus } from '../../../slices/spatialSlice';
import { DEFAULT_GEOJSON } from '../../../constants/index';




const SpatialAnalysis = ({ spatialViewConfig, onSpatialViewChange }) => {
  // Access data from Redux store
  const dispatch = useDispatch();
  const spatialData = useSelector((state) => state.spatial.data);
  const loading = useSelector((state) => state.spatial.status.loading);
  const error = useSelector((state) => state.spatial.status.error);
  const selectedRegion = useSelector((state) => state.spatial.ui.selectedRegion);
  const geoJSON = useSelector(selectGeoJSON);
  const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity);
  const regressionAnalysis = useSelector(state => state.spatial.data.regressionAnalysis);

  // Destructure necessary data
  const { marketClusters, flowMaps } = spatialData || {};

  // Memoize the data to avoid unnecessary re-renders
  const memoizedGeoJSON = useMemo(() => geoJSON, [geoJSON]);
  const memoizedMarketClusters = useMemo(() => marketClusters, [marketClusters]);
  const memoizedFlowMaps = useMemo(() => flowMaps, [flowMaps]);

  // Handle region selection (if applicable)
  const handleRegionClick = useCallback(
    (regionId) => {
      dispatch(setSelectedRegion(regionId));
    },
    [dispatch]
  );

  // Load regression analysis when commodity changes
  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchRegressionAnalysis({ commodity: selectedCommodity }));
    }
  }, [selectedCommodity, dispatch]);

  // Handle loading and error states
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Error loading spatial data: ${error}`} />;
  }

  // Pass data and view config to MapComponent
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapComponent
        geoJSON={geoJSON || DEFAULT_GEOJSON}
        marketClusters={memoizedMarketClusters}
        flowMaps={memoizedFlowMaps}
        spatialViewConfig={spatialViewConfig}
        onSpatialViewChange={onSpatialViewChange}
        onRegionClick={handleRegionClick}
        selectedRegion={selectedRegion}
        getRegionStyle={(feature) => ({
          ...baseStyle,
          fillColor: getResidualColor(
            regressionAnalysis?.residuals?.byRegion[feature.properties.region_id]?.residual
          ),
          weight: selectedRegion === feature.properties.region_id ? 3 : 1,
        })}
      />
      
      {regressionAnalysis && (
        <Paper sx={{ p: 2, m: 2 }}>
          <Typography variant="h6">Spatial Analysis Results</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Spatial Lag Coefficient</Typography>
              <Typography>
                {regressionAnalysis.model.coefficients.spatial_lag_price?.toFixed(4)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Moran's I</Typography>
              <Typography>
                {regressionAnalysis.spatial.moran_i.I?.toFixed(4)}
                {' (p-value: '}{regressionAnalysis.spatial.moran_i['p-value']?.toFixed(3)}{')'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Model Fit</Typography>
              <Typography>
                R² = {regressionAnalysis.model.r_squared?.toFixed(4)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
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