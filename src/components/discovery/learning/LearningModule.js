// src/components/discovery/learning/LearningModule.js

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlockMath } from 'react-katex';
import { useDiscoveryData } from '@/hooks';;
import InteractiveDemoContainer from '../InteractiveDemoContainer';

const LearningModule = ({ 
  moduleId,
  title,
  sections,
  onComplete,
  onProgress,
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const { trackInteraction } = useDiscoveryData('learning');

  // Timer for tracking time spent
  useEffect(() => {
    let timer;
    if (!isPaused) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
        onProgress?.({ timeSpent: timeSpent + 1, activeStep });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPaused, timeSpent, activeStep, onProgress]);

  const handleNext = useCallback(() => {
    trackInteraction('section_complete', {
      moduleId,
      sectionIndex: activeStep,
      timeSpent: timeSpent,
    });

    if (activeStep === sections.length - 1) {
      onComplete?.({ timeSpent, completedAt: new Date() });
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }, [activeStep, sections.length, moduleId, timeSpent, trackInteraction, onComplete]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => prev - 1);
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setTimeSpent(0);
    trackInteraction('module_reset', { moduleId });
  }, [moduleId, trackInteraction]);

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'demo':
        return (
          <InteractiveDemoContainer
            title={section.title}
            steps={section.steps}
            onComplete={() => handleNext()}
          />
        );
      case 'exercise':
        return (
          <Box sx={{ my: 2 }}>
            {section.content}
            {section.exercise}
          </Box>
        );
      case 'theory':
        return (
          <Box sx={{ my: 2 }}>
            <Typography variant="body1" paragraph>
              {section.content}
            </Typography>
            {section.equation && (
              <Box sx={{ my: 2 }}>
                <BlockMath>{section.equation}</BlockMath>
              </Box>
            )}
          </Box>
        );
      default:
        return section.content;
    }
  };

  return (
    <Paper 
      component={motion.div}
      layout
      sx={{ p: 2 }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h6">{title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={isPaused ? "Resume" : "Pause"}>
            <IconButton 
              size="small" 
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Module">
            <IconButton size="small" onClick={handleReset}>
              <RotateCcw size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isPaused && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button 
              size="small" 
              onClick={() => setIsPaused(false)}
              startIcon={<Play size={16} />}
            >
              Resume
            </Button>
          }
        >
          Learning module is paused. Take your time!
        </Alert>
      )}

      <Stepper 
        activeStep={activeStep} 
        orientation="vertical"
        sx={{ mb: 2 }}
      >
        {sections.map((section, index) => (
          <Step key={index}>
            <StepLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {section.title}
                {section.helpContent && (
                  <Tooltip title="View Help">
                    <IconButton size="small">
                      <HelpCircle size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </StepLabel>
            <StepContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {renderSectionContent(section)}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Time spent on this section: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      startIcon={<ArrowLeft size={16} />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      endIcon={index === sections.length - 1 ? 
                        <CheckCircle size={16} /> : 
                        <ArrowRight size={16} />
                      }
                    >
                      {index === sections.length - 1 ? 'Complete' : 'Continue'}
                    </Button>
                  </Box>
                </motion.div>
              </AnimatePresence>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {activeStep === sections.length && (
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity="success"
            action={
              <Button
                size="small"
                onClick={handleReset}
                startIcon={<RotateCcw size={16} />}
              >
                Start Over
              </Button>
            }
          >
            <AlertTitle>Module Complete!</AlertTitle>
            You've completed this learning module in {Math.floor(timeSpent / 60)} minutes 
            and {timeSpent % 60} seconds.
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

LearningModule.propTypes = {
  moduleId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['demo', 'exercise', 'theory']).isRequired,
    content: PropTypes.node,
    equation: PropTypes.string,
    steps: PropTypes.array,
    exercise: PropTypes.node,
    helpContent: PropTypes.node,
  })).isRequired,
  onComplete: PropTypes.func,
  onProgress: PropTypes.func,
};

export default LearningModule;