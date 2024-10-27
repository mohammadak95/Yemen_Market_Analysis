// src/components/discovery/InteractiveDemoContainer.js

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Refresh,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const InteractiveDemoContainer = ({
  title,
  description,
  steps,
  onComplete,
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Validate steps
  if (!Array.isArray(steps) || steps.length === 0) {
    return (
      <Alert severity="error">
        No steps provided for the interactive demo.
      </Alert>
    );
  }

  // Validate current step content
  const currentStep = steps[activeStep];
  if (!currentStep || !currentStep.content) {
    return (
      <Alert severity="error">
        Invalid step configuration.
      </Alert>
    );
  }

  const handleNext = useCallback(() => {
    setActiveStep((prev) => {
      if (prev === steps.length - 1) {
        onComplete?.();
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length, onComplete]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <Paper
      ref={containerRef}
      component={motion.div}
      layout
      elevation={isFullscreen ? 24 : 1}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '600px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isFullscreen ? theme.zIndex.modal : 1,
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{title}</Typography>
            {!isMobile && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Reset Demo">
              <IconButton onClick={handleReset} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={toggleFullscreen} size="small">
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%', overflow: 'auto', padding: theme.spacing(2) }}
          >
            {currentStep.content}
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBack />}
        >
          Back
        </Button>

        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>

        <Button
          onClick={handleNext}
          variant="contained"
          endIcon={<ArrowForward />}
        >
          {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
};

InteractiveDemoContainer.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
  onComplete: PropTypes.func,
  children: PropTypes.node,
};

export default InteractiveDemoContainer;
