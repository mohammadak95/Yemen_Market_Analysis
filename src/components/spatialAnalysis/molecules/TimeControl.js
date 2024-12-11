import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';

// Helper function to normalize date to YYYY-MM format
const normalizeDate = (date) => {
  try {
    // Handle both YYYY-MM and YYYY-MM-DD formats
    return date?.substring(0, 7);
  } catch (error) {
    console.error('Error normalizing date:', error);
    return date;
  }
};

// Helper function to format date for display
const formatDate = (date) => {
  try {
    // Add day to ensure valid date
    const fullDate = `${normalizeDate(date)}-01`;
    return new Date(fullDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date;
  }
};

const TimeControl = ({
  dates,
  currentDate,
  onChange,
  autoPlayInterval = 1000,
  position = null
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sliderValue, setSliderValue] = useState(0);

  // Normalize all dates
  const normalizedDates = dates.map(normalizeDate);
  const normalizedCurrentDate = normalizeDate(currentDate);

  // Initialize slider value based on current date
  useEffect(() => {
    const currentIndex = normalizedDates.indexOf(normalizedCurrentDate);
    
    console.debug('TimeControl date initialization:', {
      currentDate,
      normalizedCurrentDate,
      currentIndex,
      availableDates: normalizedDates,
      dates
    });
    
    if (currentIndex >= 0) {
      setSliderValue(currentIndex);
    } else {
      // If current date is not found, use the first date
      console.debug('Current date not found in dates array, using first date');
      setSliderValue(0);
      // Notify parent of the change
      if (dates.length > 0) {
        onChange(normalizeDate(dates[0]));
      }
    }
  }, [currentDate, dates, normalizedCurrentDate, normalizedDates, onChange]);

  // Handle auto-play
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

  // Handle slider value changes
  const handleSliderChange = (_, value) => {
    if (value !== sliderValue) {
      const newDate = normalizeDate(dates[value]);
      console.debug('Slider change:', {
        value,
        newDate,
        currentDate: normalizedCurrentDate
      });
      setSliderValue(value);
      onChange(newDate);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    const newValue = Math.max(0, sliderValue - 1);
    handleSliderChange(null, newValue);
  };

  const handleNext = () => {
    const newValue = Math.min(dates.length - 1, sliderValue + 1);
    handleSliderChange(null, newValue);
  };

  const handleSpeedChange = () => {
    setPlaybackSpeed(prev => (prev === 4 ? 1 : prev * 2));
  };

  // Debug logging
  console.debug('TimeControl state:', {
    currentDate,
    normalizedCurrentDate,
    sliderValue,
    selectedDate: dates[sliderValue],
    normalizedSelectedDate: normalizeDate(dates[sliderValue]),
    totalDates: dates.length,
    isPlaying,
    playbackSpeed
  });

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        p: 2,
        ...(position && {
          position: 'absolute',
          zIndex: 1000,
          ...position
        })
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography 
          variant="subtitle2" 
          color="textPrimary"
          sx={{ 
            display: 'block', 
            mb: 1, 
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {formatDate(dates[sliderValue])}
        </Typography>

        <Slider
          value={sliderValue}
          min={0}
          max={dates.length - 1}
          onChange={handleSliderChange}
          sx={{ 
            mb: 2,
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12
            }
          }}
        />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1,
          '& .MuiIconButton-root': {
            padding: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }
        }}>
          <IconButton 
            size="small" 
            onClick={handlePrevious}
            disabled={sliderValue === 0}
            title="Previous"
          >
            <SkipPreviousIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon fontSize="small" />
            ) : (
              <PlayArrowIcon fontSize="small" />
            )}
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handleNext}
            disabled={sliderValue === dates.length - 1}
            title="Next"
          >
            <SkipNextIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handleSpeedChange}
            title={`Playback Speed: ${playbackSpeed}x`}
            sx={{ position: 'relative' }}
          >
            <SpeedIcon fontSize="small" />
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute',
                bottom: 2,
                right: 2,
                fontSize: '0.6rem',
                fontWeight: 'bold',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '50%',
                width: 12,
                height: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {playbackSpeed}x
            </Typography>
          </IconButton>
        </Box>
      </Box>
    </Paper>
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
