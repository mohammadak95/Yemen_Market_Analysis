import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '@mui/material/styles';
import * as d3Scale from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { format, parseISO } from 'date-fns';

// Inner component to handle map updates
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

// TimeSlider component
const TimeSlider = ({ months, selectedDate, onChange }) => {
  if (!months || !months.length) return null;

  const minTime = months[0].getTime();
  const maxTime = months[months.length - 1].getTime();
  const currentTime = selectedDate ? selectedDate.getTime() : minTime;

  const formatLabel = (value) => {
    return format(new Date(value), 'MMM yyyy');
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <input
        type="range"
        min={minTime}
        max={maxTime}
        value={currentTime}
        onChange={(e) => {
          onChange(new Date(Number(e.target.value)));
        }}
        style={{ width: '100%' }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">{formatLabel(minTime)}</Typography>
        <Typography variant="caption">{formatLabel(maxTime)}</Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onChange: PropTypes.func.isRequired,
};

const EnhancedChoroplethMap = ({
  data,
  selectedDate: initialSelectedDate,
  onDateChange,
  variable = 'value',
  colorScheme = 'blues',
  center = [15.3694, 44.191],
  zoom = 6,
  onRegionClick,
  onRegionHover
}) => {
  const theme = useTheme();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processedData, setProcessedData] = useState(null);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Process dates and unique months
  useEffect(() => {
    if (!data?.features) return;

    try {
      const dates = data.features
        .map(f => f.properties?.date)
        .filter(Boolean)
        .map(dateStr => {
          const date = parseISO(dateStr);
          return date;
        })
        .filter(date => !isNaN(date.getTime()));

      const uniqueDates = Array.from(
        new Set(
          dates.map(date => 
            format(date, 'yyyy-MM-01')
          )
        )
      )
      .map(dateStr => parseISO(dateStr))
      .sort((a, b) => a - b);

      setUniqueMonths(uniqueDates);
      
      // Set initial selected date if not already set
      if (!selectedDate && uniqueDates.length > 0) {
        const initialDate = initialSelectedDate || uniqueDates[uniqueDates.length - 1];
        setSelectedDate(initialDate);
      }
    } catch (err) {
      console.error('Error processing dates:', err);
      setError('Error processing date data');
    }
  }, [data, initialSelectedDate, selectedDate]);

  // Process GeoJSON data
  useEffect(() => {
    if (!data || !selectedDate) return;

    setIsLoading(true);
    try {
      const currentDate = format(selectedDate, 'yyyy-MM-dd');
      
      const filteredFeatures = data.features.filter(feature => {
        const featureDate = feature.properties?.date;
        if (!featureDate) return false;
        
        return format(parseISO(featureDate), 'yyyy-MM-dd') === currentDate;
      });

      setProcessedData({
        type: 'FeatureCollection',
        features: filteredFeatures
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing GeoJSON:', err);
      setError('Error processing geographic data');
      setIsLoading(false);
    }
  }, [data, selectedDate]);

  // Color scale
  const colorScale = useMemo(() => {
    if (!processedData?.features?.length) return null;

    const values = processedData.features
      .map(f => f.properties[variable])
      .filter(v => v != null && !isNaN(v));

    if (!values.length) return null;

    return d3Scale.scaleSequential()
      .domain([Math.min(...values), Math.max(...values)])
      .interpolator(interpolateBlues);
  }, [processedData, variable]);

  // Style function
  const getStyle = useCallback((feature) => {
    const value = feature.properties?.[variable];
    return {
      fillColor: value != null && colorScale ? colorScale(value) : '#ccc',
      weight: 1,
      opacity: 1,
      color: theme.palette.divider,
      fillOpacity: 0.7
    };
  }, [colorScale, variable, theme.palette.divider]);

  // Event handlers
  const handleDateChange = useCallback((newDate) => {
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  }, [onDateChange]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ position: 'relative', height: 500, width: '100%' }}>
        {isLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
          }}>
            <CircularProgress />
          </Box>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <MapUpdater center={center} zoom={zoom} />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {processedData && (
            <GeoJSON
              key={`geojson-${selectedDate?.toISOString() || 'initial'}`}
              data={processedData}
              style={getStyle}
              onEachFeature={(feature, layer) => {
                if (onRegionClick) {
                  layer.on('click', () => onRegionClick(feature.properties));
                }
                if (onRegionHover) {
                  layer.on('mouseover', () => onRegionHover(feature.properties));
                }
              }}
            />
          )}
        </MapContainer>
      </Box>

      {uniqueMonths.length > 0 && selectedDate && (
        <TimeSlider
          months={uniqueMonths}
          selectedDate={selectedDate}
          onChange={handleDateChange}
        />
      )}
    </Paper>
  );
};

EnhancedChoroplethMap.propTypes = {
  data: PropTypes.shape({
    type: PropTypes.string.isRequired,
    features: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      geometry: PropTypes.object.isRequired,
      properties: PropTypes.object.isRequired,
    })).isRequired,
  }),
  selectedDate: PropTypes.instanceOf(Date),
  onDateChange: PropTypes.func,
  variable: PropTypes.string,
  colorScheme: PropTypes.string,
  center: PropTypes.arrayOf(PropTypes.number),
  zoom: PropTypes.number,
  onRegionClick: PropTypes.func,
  onRegionHover: PropTypes.func,
};

export default EnhancedChoroplethMap;