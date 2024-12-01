import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography, 
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';

const TimeControl = ({
  dates,
  currentDate,
  onChange,
  autoPlayInterval = 1000,
  position = null // Make position optional
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sliderValue, setSliderValue] = useState(0);

  useEffect(() => {
    const currentIndex = dates.indexOf(currentDate);
    setSliderValue(currentIndex);
  }, [currentDate, dates]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setSliderValue(prev => {
          const next = prev + 1;
          if (next >= dates.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, autoPlayInterval / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, dates.length, autoPlayInterval, playbackSpeed]);

  useEffect(() => {
    onChange(dates[sliderValue]);
  }, [sliderValue, dates, onChange]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setSliderValue(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setSliderValue(prev => Math.min(dates.length - 1, prev + 1));
  };

  const handleSpeedChange = () => {
    setPlaybackSpeed(prev => (prev === 4 ? 1 : prev * 2));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  // Base styles for the container
  const containerStyles = {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: 1,
    ...(position && {
      position: 'absolute',
      zIndex: 1000,
      ...position
    })
  };

  return (
    <Box sx={containerStyles}>
      <Box sx={{ width: '100%', px: 2 }}>
        <Typography 
          variant="caption" 
          color="textSecondary"
          sx={{ display: 'block', mb: 1, textAlign: 'center' }}
        >
          {formatDate(dates[sliderValue])}
        </Typography>

        <Slider
          value={sliderValue}
          min={0}
          max={dates.length - 1}
          onChange={(_, value) => setSliderValue(value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Tooltip title="Previous">
            <IconButton 
              size="small" 
              onClick={handlePrevious}
              disabled={sliderValue === 0}
            >
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <IconButton size="small" onClick={handlePlayPause}>
              {isPlaying ? (
                <PauseIcon fontSize="small" />
              ) : (
                <PlayArrowIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Next">
            <IconButton 
              size="small" 
              onClick={handleNext}
              disabled={sliderValue === dates.length - 1}
            >
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={`Playback Speed: ${playbackSpeed}x`}>
            <IconButton size="small" onClick={handleSpeedChange}>
              <SpeedIcon fontSize="small" />
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  fontSize: '0.6rem',
                  fontWeight: 'bold'
                }}
              >
                {playbackSpeed}x
              </Typography>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

TimeControl.propTypes = {
  dates: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoPlayInterval: PropTypes.number,
  position: PropTypes.shape({
    top: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    right: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    bottom: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    transform: PropTypes.string
  })
};

export default React.memo(TimeControl);
