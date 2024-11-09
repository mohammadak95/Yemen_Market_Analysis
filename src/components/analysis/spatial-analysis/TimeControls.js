// src/components/analysis/spatial-analysis/TimeControls.js

import React, { useMemo, useCallback, useEffect } from 'react';
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
import debounce from 'lodash.debounce';

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

  // Memoize formatted dates
  const formattedDates = useMemo(() => {
    return availableMonths.map(month => 
      new Date(month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
    );
  }, [availableMonths]);

  // Calculate market integration metrics
  const marketMetrics = useMemo(() => {
    if (!analysisResults) return {};
    const connections = Object.values(spatialWeights || {}).reduce(
      (sum, { neighbors }) => sum + (neighbors?.length || 0), 
      0
    );
    const avgConnections = connections / (Object.keys(spatialWeights || {}).length * 2 || 1);
    const integrationLevel = analysisResults.integrationLevel || 0;
    const priceStability = analysisResults.stability || 0;
    return {
      connections: avgConnections,
      integration: integrationLevel,
      stability: priceStability
    };
  }, [analysisResults, spatialWeights]);

  // Handle Slider Change with debounce
  const debouncedSliderChange = useMemo(() => 
    debounce((event, newValue) => {
      onMonthChange(availableMonths[newValue]);
    }, 300),
    [availableMonths, onMonthChange]
  );

  const handleSliderChange = useCallback((event, newValue) => {
    debouncedSliderChange(event, newValue);
  }, [debouncedSliderChange]);

  // Handle Previous Button Click
  const handlePrevious = useCallback(() => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1]);
    }
  }, [availableMonths, selectedMonth, onMonthChange]);

  // Handle Next Button Click
  const handleNext = useCallback(() => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1]);
    }
  }, [availableMonths, selectedMonth, onMonthChange]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentIndex = availableMonths.indexOf(selectedMonth);
      if (currentIndex < availableMonths.length - 1) {
        onMonthChange(availableMonths[currentIndex + 1]);
      } else {
        clearInterval(interval);
      }
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, availableMonths, selectedMonth, onMonthChange, playbackSpeed]);

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
        {/* Timeline Slider */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Slider
            value={availableMonths.indexOf(selectedMonth)}
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

        {/* Playback Controls and Metrics */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 2 
        }}>
          {/* Playback Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handlePrevious}
              disabled={availableMonths.indexOf(selectedMonth) === 0}
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
              disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
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
            value={(availableMonths.indexOf(selectedMonth) / (availableMonths.length - 1)) * 100}
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
