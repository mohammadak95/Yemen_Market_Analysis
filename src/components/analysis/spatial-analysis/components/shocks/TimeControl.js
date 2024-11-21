// src/components/analysis/spatial-analysis/components/shocks/TimeControl.js

import React from 'react';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext } from '@mui/icons-material';

const TimeControl = ({ timeRange, selectedDate, onChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1000);

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

  React.useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        handleNext();
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedDate, playbackSpeed]);

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
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
      />
      
      <Typography variant="body2" sx={{ minWidth: 100 }}>
        {new Date(selectedDate).toLocaleDateString()}
      </Typography>
    </Box>
  );
};

export default TimeControl;