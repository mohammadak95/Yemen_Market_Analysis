import React, { useMemo } from 'react';
import { Box, Typography, useTheme, useMediaQuery, Paper } from '@mui/material';
import { scaleLinear } from 'd3-scale';
import { extent, line } from 'd3-array';
import { CLUSTER_COLORS, SIGNIFICANCE_LEVELS } from './types';

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
    { top: 40, right: 20, bottom: 40, left: 40 } : 
    { top: 50, right: 30, bottom: 50, left: 50 };
  
  const width = isSmallScreen ? 300 : 500;
  const height = isSmallScreen ? 300 : 500;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Transform data for plotting with enhanced statistics
  const plotData = useMemo(() => {
    if (!data) return { points: [], regressionLine: [], confidenceBands: [] };

    const points = Object.entries(data).map(([region, stats]) => ({
      region,
      x: stats.local_i || 0,
      y: stats.spatial_lag || 0,
      cluster_type: stats.cluster_type || 'not_significant',
      significance: stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT,
      p_value: stats.p_value,
      z_score: stats.z_score,
      clusterStrength: Math.abs(stats.local_i) * (stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 1 : 0.5),
      variance: stats.variance || 0,
      isSelected: region === selectedRegion
    }));

    // Calculate regression line
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const n = points.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate regression line points
    const [xMin, xMax] = extent(points, d => d.x);
    const regressionLine = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept }
    ];

    // Calculate confidence bands
    const standardError = Math.sqrt(
      points.reduce((sum, p) => {
        const predicted = slope * p.x + intercept;
        return sum + Math.pow(p.y - predicted, 2);
      }, 0) / (n - 2)
    );

    const confidenceBands = xValues.map(x => {
      const predicted = slope * x + intercept;
      const se = standardError * Math.sqrt(1/n + Math.pow(x - sumX/n, 2) / (sumXX - sumX*sumX/n));
      const ci95 = 1.96 * se;
      return {
        x,
        yLower: predicted - ci95,
        yUpper: predicted + ci95
      };
    }).sort((a, b) => a.x - b.x);

    return { points, regressionLine, confidenceBands };
  }, [data, selectedRegion]);

  // Calculate scales with padding
  const xScale = useMemo(() => {
    const [min, max] = extent(plotData.points, d => d.x);
    const padding = Math.abs(max - min) * 0.1;
    return scaleLinear()
      .domain([min - padding, max + padding])
      .range([0, innerWidth]);
  }, [plotData, innerWidth]);

  const yScale = useMemo(() => {
    const [min, max] = extent(plotData.points, d => d.y);
    const padding = Math.abs(max - min) * 0.1;
    return scaleLinear()
      .domain([min - padding, max + padding])
      .range([innerHeight, 0]);
  }, [plotData, innerHeight]);

  // Format values for tooltip
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
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
        p: 2,
        position: 'relative'
      }}
    >
      <Typography variant="h6" gutterBottom align="center">
        Moran&apos;s I Scatter Plot
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom align="center">
        Global Moran&apos;s I: {formatValue(globalMoranI)} 
        {data[Object.keys(data)[0]]?.p_value && 
          ` (p-value: ${formatValue(data[Object.keys(data)[0]].p_value)})`}
      </Typography>

      {/* Instructions Banner */}
      <Paper
        elevation={1}
        sx={{
          position: 'absolute',
          top: margin.top,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          maxWidth: '90%',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Click on any point to view detailed market cluster analysis
        </Typography>
      </Paper>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: width, maxHeight: height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="plot-area">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Confidence bands */}
          <path
            d={`M ${plotData.confidenceBands.map(p => `${xScale(p.x)},${yScale(p.yLower)}`).join('L')} 
                L ${plotData.confidenceBands.reverse().map(p => `${xScale(p.x)},${yScale(p.yUpper)}`).join('L')} Z`}
            fill={theme.palette.primary.main}
            opacity={0.1}
            clipPath="url(#plot-area)"
          />

          {/* Regression line */}
          <path
            d={`M ${plotData.regressionLine.map(p => `${xScale(p.x)},${yScale(p.y)}`).join('L')}`}
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            strokeDasharray="4"
            fill="none"
            opacity={0.6}
            clipPath="url(#plot-area)"
          />

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

          {/* Points with enhanced styling */}
          {plotData.points.map((point, i) => {
            const baseRadius = point.significance ? 6 : 5;
            const radius = point.isSelected ? baseRadius + 2 : baseRadius;
            
            return (
              <g key={i}>
                {/* Confidence interval circle */}
                {point.variance > 0 && (
                  <circle
                    cx={xScale(point.x)}
                    cy={yScale(point.y)}
                    r={radius + Math.sqrt(point.variance) * 10}
                    fill={CLUSTER_COLORS[point.cluster_type]}
                    opacity={0.1}
                  />
                )}
                {/* Main point */}
                <circle
                  cx={xScale(point.x)}
                  cy={yScale(point.y)}
                  r={radius}
                  fill={CLUSTER_COLORS[point.cluster_type]}
                  stroke={point.isSelected ? theme.palette.primary.main : 'none'}
                  strokeWidth={2}
                  opacity={point.significance ? 0.8 : 0.4}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onPointSelect(point.region)}
                >
                  <title>
                    {`Region: ${point.region}
                      Cluster: ${point.cluster_type.replace('-', ' ')}
                      Local Moran's I: ${formatValue(point.x)}
                      Spatial Lag: ${formatValue(point.y)}
                      P-value: ${formatValue(point.p_value)}
                      Z-score: ${formatValue(point.z_score)}
                      Cluster Strength: ${formatValue(point.clusterStrength)}`}
                  </title>
                </circle>
              </g>
            );
          })}

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

      {/* Enhanced Legend with Instructions */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          mt: 2,
          p: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          width: '100%',
          maxWidth: isSmallScreen ? 300 : 400
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Cluster Types and Significance
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 2
          }}
        >
          {Object.entries(CLUSTER_COLORS).map(([type, color]) => (
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
                  bgcolor: color,
                  opacity: type === 'not_significant' ? 0.4 : 0.8,
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
              <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.7rem' : '0.8rem' }}>
                {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
              color: theme.palette.text.secondary,
              display: 'block'
            }}
          >
            Opacity indicates significance level
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
              color: theme.palette.text.secondary,
              display: 'block'
            }}
          >
            Circle size shows confidence interval
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(MoranScatterPlot);
