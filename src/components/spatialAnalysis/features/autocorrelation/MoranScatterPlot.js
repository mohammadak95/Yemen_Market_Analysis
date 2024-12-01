import React, { useMemo } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';

const MoranScatterPlot = ({
  data,
  globalMoranI,
  selectedRegion,
  onPointSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate dimensions based on screen size
  const margin = isSmallScreen ? 
    { top: 20, right: 20, bottom: 40, left: 40 } : 
    { top: 30, right: 30, bottom: 50, left: 50 };
  
  const width = isSmallScreen ? 300 : 500;
  const height = isSmallScreen ? 300 : 500;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Transform data for plotting
  const plotData = useMemo(() => {
    if (!data) return [];

    return Object.entries(data).map(([region, stats]) => ({
      region,
      x: stats.local_i || 0,
      y: stats.spatial_lag || 0,
      cluster_type: stats.cluster_type || 'not_significant',
      isSelected: region === selectedRegion
    }));
  }, [data, selectedRegion]);

  // Calculate scales
  const xScale = useMemo(() => {
    const [min, max] = extent(plotData, d => d.x);
    const padding = Math.abs(max - min) * 0.1;
    return scaleLinear()
      .domain([min - padding, max + padding])
      .range([0, innerWidth]);
  }, [plotData, innerWidth]);

  const yScale = useMemo(() => {
    const [min, max] = extent(plotData, d => d.y);
    const padding = Math.abs(max - min) * 0.1;
    return scaleLinear()
      .domain([min - padding, max + padding])
      .range([innerHeight, 0]);
  }, [plotData, innerHeight]);

  // Get cluster colors from theme
  const getClusterColor = (type) => {
    switch (type) {
      case 'high-high': return theme.palette.error.main;
      case 'low-low': return theme.palette.primary.main;
      case 'high-low': return theme.palette.warning.main;
      case 'low-high': return theme.palette.info.main;
      default: return theme.palette.grey[400];
    }
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <Typography color="textSecondary">
          No data available for scatter plot
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2
      }}
    >
      <Typography variant="h6" gutterBottom align="center">
        Moran&apos;s I Scatter Plot
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom align="center">
        Global Moran&apos;s I: {globalMoranI.toFixed(3)}
      </Typography>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: width, maxHeight: height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Axes */}
          <line
            x1={0}
            y1={innerHeight / 2}
            x2={innerWidth}
            y2={innerHeight / 2}
            stroke={theme.palette.text.secondary}
            strokeWidth={1}
            strokeDasharray="4"
          />
          <line
            x1={innerWidth / 2}
            y1={0}
            x2={innerWidth / 2}
            y2={innerHeight}
            stroke={theme.palette.text.secondary}
            strokeWidth={1}
            strokeDasharray="4"
          />

          {/* Points */}
          {plotData.map((point, i) => (
            <circle
              key={i}
              cx={xScale(point.x)}
              cy={yScale(point.y)}
              r={point.isSelected ? 8 : 6}
              fill={getClusterColor(point.cluster_type)}
              stroke={point.isSelected ? theme.palette.primary.main : 'none'}
              strokeWidth={2}
              opacity={point.isSelected ? 1 : 0.7}
              style={{ cursor: 'pointer' }}
              onClick={() => onPointSelect(point.region)}
            />
          ))}

          {/* Axes labels */}
          <text
            x={innerWidth / 2}
            y={innerHeight + margin.bottom - 10}
            textAnchor="middle"
            fill={theme.palette.text.primary}
            fontSize={isSmallScreen ? "0.8rem" : "1rem"}
          >
            Local Moran&apos;s I
          </text>
          <text
            x={-innerHeight / 2}
            y={-margin.left + 15}
            transform="rotate(-90)"
            textAnchor="middle"
            fill={theme.palette.text.primary}
            fontSize={isSmallScreen ? "0.8rem" : "1rem"}
          >
            Spatial Lag
          </text>
        </g>
      </svg>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 2,
          mt: 2
        }}
      >
        {['high-high', 'low-low', 'high-low', 'low-high', 'not_significant'].map(type => (
          <Box
            key={type}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getClusterColor(type),
                opacity: 0.7
              }}
            />
            <Typography variant="caption">
              {type.replace('-', ' ')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default React.memo(MoranScatterPlot);
