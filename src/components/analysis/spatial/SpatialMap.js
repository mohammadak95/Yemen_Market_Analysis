import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Slider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { selectGeometryData } from '../../../selectors/optimizedSelectors';
import { getColorScale, getResidualStats } from './utils/mapUtils';
import { analysisStyles } from '../../../styles/analysisStyles';
import Legend from './components/Legend';

// Yemen bounds and center coordinates
const YEMEN_BOUNDS = [
  [12.5, 42.5], // Southwest corner
  [19.0, 54.5]  // Northeast corner
];
const YEMEN_CENTER = [15.5527, 48.5164];
const YEMEN_ZOOM = 6;

const SpatialMap = ({ results, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Get geometry data from Redux store
  const geometryData = useSelector(selectGeometryData);

  // Process residuals data
  const { residualsByDate, dates, residualStats } = useMemo(() => {
    if (!results?.residual) return { residualsByDate: {}, dates: [], residualStats: null };
    
    // Group residuals by date
    const byDate = results.residual.reduce((acc, r) => {
      const date = r.date;
      if (!acc[date]) acc[date] = {};
      acc[date][r.region_id] = r.residual;
      return acc;
    }, {});

    const availableDates = Object.keys(byDate).sort();
    const stats = getResidualStats(results.residual);

    return {
      residualsByDate: byDate,
      dates: availableDates,
      residualStats: stats
    };
  }, [results]);

  // Set initial date if not set
  React.useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  // Get color scale
  const colorScale = useMemo(() => {
    if (!residualStats) return null;
    return getColorScale(residualStats.min, residualStats.max, theme);
  }, [residualStats, theme]);

  // Style function for GeoJSON
  const getRegionStyle = (feature) => {
    const regionId = feature.properties?.region_id;
    const residual = selectedDate && residualsByDate[selectedDate]?.[regionId];

    return {
      fillColor: residual != null ? colorScale(residual) : theme.palette.grey[300],
      weight: 1,
      opacity: 1,
      color: theme.palette.grey[500],
      fillOpacity: residual != null ? 0.7 : 0.3
    };
  };

  if (!geometryData || !results) {
    return (
      <Box sx={styles.loadingContainer}>
        <Typography>No data available for mapping</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Spatial Distribution of Residuals
      </Typography>

      {/* Date selector */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Date</InputLabel>
        <Select
          value={selectedDate || ''}
          onChange={(e) => setSelectedDate(e.target.value)}
          label="Select Date"
        >
          {dates.map(date => (
            <MenuItem key={date} value={date}>
              {new Date(date).toLocaleDateString()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Map container */}
      <Box sx={{ height: 400, position: 'relative' }}>
        <MapContainer
          center={YEMEN_CENTER}
          zoom={YEMEN_ZOOM}
          bounds={YEMEN_BOUNDS}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <GeoJSON
            data={geometryData}
            style={getRegionStyle}
            onEachFeature={(feature, layer) => {
              const regionId = feature.properties?.region_id;
              const residual = selectedDate && residualsByDate[selectedDate]?.[regionId];
              
              layer.bindTooltip(() => `
                <div>
                  <strong>${regionId}</strong><br/>
                  Residual: ${residual != null ? residual.toFixed(4) : 'N/A'}
                </div>
              `, {
                sticky: true,
                direction: 'auto'
              });
            }}
          />
        </MapContainer>

        {/* Legend */}
        <Legend
          min={residualStats?.min}
          max={residualStats?.max}
          colorScale={colorScale}
          position="bottomright"
        />
      </Box>
    </Paper>
  );
};

SpatialMap.propTypes = {
  results: PropTypes.shape({
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired
    })).isRequired
  }).isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default SpatialMap;