import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const LoadingIndicator = ({
  message = 'Loading...',
  progress,
  variant = 'circular',
  fullscreen = false,
  overlay = false,
  height = '100%'
}) => {
  const theme = useTheme();

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullscreen ? '100vh' : height,
        width: '100%',
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: theme.zIndex.modal,
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        })
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress
          size={48}
          thickness={4}
          sx={{ mb: 2 }}
          {...(typeof progress === 'number' && {
            variant: 'determinate',
            value: progress
          })}
        />
      ) : (
        <Box sx={{ width: '60%', maxWidth: 400, mb: 2 }}>
          <LinearProgress
            {...(typeof progress === 'number' && {
              variant: 'determinate',
              value: progress
            })}
          />
        </Box>
      )}

      {message && (
        <Typography
          variant="body1"
          color="textSecondary"
          align="center"
          sx={{ 
            maxWidth: 400,
            px: 2,
            ...(typeof progress === 'number' && { mb: 1 })
          }}
        >
          {message}
        </Typography>
      )}

      {typeof progress === 'number' && (
        <Typography variant="body2" color="textSecondary">
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );

  if (fullscreen || overlay) {
    return content;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'transparent'
      }}
    >
      {content}
    </Paper>
  );
};

LoadingIndicator.propTypes = {
  message: PropTypes.string,
  progress: PropTypes.number,
  variant: PropTypes.oneOf(['circular', 'linear']),
  fullscreen: PropTypes.bool,
  overlay: PropTypes.bool,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export const LoadingOverlay = (props) => (
  <LoadingIndicator {...props} overlay />
);

export const FullscreenLoading = (props) => (
  <LoadingIndicator {...props} fullscreen />
);

export default LoadingIndicator;
