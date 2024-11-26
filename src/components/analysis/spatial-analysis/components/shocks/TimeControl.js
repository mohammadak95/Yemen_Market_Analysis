// src/components/analysis/spatial-analysis/components/shocks/TimeControl.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext } from '@mui/icons-material';

const TimeControl = ({ timeRange, selectedDate, onChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed] = React.useState(1000); // Playback speed in milliseconds

  const currentIndex = timeRange.indexOf(selectedDate);

  const handleSliderChange = (event, newValue) => {
    onChange(timeRange[newValue]);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentIndex < timeRange.length - 1) {
      onChange(timeRange[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onChange(timeRange[currentIndex - 1]);
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentIndex < timeRange.length - 1) {
          handleNext();
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, timeRange.length, playbackSpeed]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <IconButton onClick={handlePrevious} disabled={currentIndex === 0}>
        <SkipPrevious />
      </IconButton>
      <IconButton onClick={handlePlayPause}>
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
      <IconButton onClick={handleNext} disabled={currentIndex === timeRange.length - 1}>
        <SkipNext />
      </IconButton>
      <Slider
        value={currentIndex}
        min={0}
        max={timeRange.length - 1}
        onChange={handleSliderChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => new Date(timeRange[value]).toLocaleDateString()}
        sx={{ flexGrow: 1 }}
      />
      <Typography variant="body2">
        {new Date(selectedDate).toLocaleDateString()}
      </Typography>
    </Box>
  );
};

TimeControl.propTypes = {
  timeRange: PropTypes.array.isRequired,
  selectedDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeControl;