import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Slider,
  Typography,
  Tooltip as MuiTooltip,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Warning
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const TimeControls = ({
  availableMonths = [],
  selectedMonth,
  onMonthChange,
  analysisResults,
  spatialWeights,
  isPlaying = false,
  onPlayToggle,
  playbackSpeed = 1000
}) => {
  const theme = useTheme();

  const {
    monthIndex,
    formattedDates,
    marketMetrics
  } = useMemo(() => {
    const index = availableMonths.indexOf(selectedMonth);
    const dates = availableMonths.map(month => 
      new Date(month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
    );

    // Calculate market integration metrics
    const metrics = analysisResults?.[selectedMonth]?.['market_metrics'] || {};
    const connections = Object.values(spatialWeights || {}).reduce(
      (sum, { neighbors }) => sum + (neighbors?.length || 0), 
      0
    );
    const avgConnections = connections / (Object.keys(spatialWeights || {}).length * 2);

    return {
      monthIndex: index,
      formattedDates: dates,
      marketMetrics: {
        connections: avgConnections,
        integration: metrics.integration_level || 0,
        stability: metrics.price_stability || 0
      }
    };
  }, [availableMonths, selectedMonth, analysisResults, spatialWeights]);

  const handleSliderChange = (_, newValue) => {
    onMonthChange(availableMonths[newValue]);
  };

  const handlePrevious = () => {
    if (monthIndex > 0) {
      onMonthChange(availableMonths[monthIndex - 1]);
    }
  };

  const handleNext = () => {
    if (monthIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[monthIndex + 1]);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: '90%', sm: '80%', md: '60%' },
        p: 2,
        zIndex: 1000
      }}
    >
      <Box sx={{ width: '100%' }}>
        {/* Timeline */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Slider
            value={monthIndex}
            min={0}
            max={availableMonths.length - 1}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            valueLabelFormat={value => formattedDates[value]}
            marks={availableMonths.map((_, index) => ({
              value: index,
              label: index % 6 === 0 ? formattedDates[index] : ''
            }))}
          />
        </Box>

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handlePrevious}
              disabled={monthIndex === 0}
              size="small"
            >
              <SkipPrevious />
            </IconButton>
            <IconButton
              onClick={onPlayToggle}
              size="small"
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={monthIndex === availableMonths.length - 1}
              size="small"
            >
              <SkipNext />
            </IconButton>
          </Box>

          {/* Market Metrics */}
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <MuiTooltip title="Market Connections">
              <Typography variant="body2" color="text.secondary">
                Connections: {(marketMetrics.connections * 100).toFixed(1)}%
              </Typography>
            </MuiTooltip>
            <MuiTooltip title="Market Integration">
              <Typography variant="body2" color="text.secondary">
                Integration: {(marketMetrics.integration * 100).toFixed(1)}%
              </Typography>
            </MuiTooltip>
            <MuiTooltip title="Price Stability">
              <Typography variant="body2" color="text.secondary">
                Stability: {(marketMetrics.stability * 100).toFixed(1)}%
              </Typography>
            </MuiTooltip>
          </Box>
        </Box>

        {/* Playback Progress */}
        {isPlaying && (
          <LinearProgress
            variant="determinate"
            value={(monthIndex / (availableMonths.length - 1)) * 100}
            sx={{ mt: 1 }}
          />
        )}
      </Box>
    </Paper>
  );
};

TimeControls.propTypes = {
  availableMonths: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedMonth: PropTypes.string.isRequired,
  onMonthChange: PropTypes.func.isRequired,
  analysisResults: PropTypes.object,
  spatialWeights: PropTypes.object,
  isPlaying: PropTypes.bool,
  onPlayToggle: PropTypes.func,
  playbackSpeed: PropTypes.number
};

export default React.memo(TimeControls);