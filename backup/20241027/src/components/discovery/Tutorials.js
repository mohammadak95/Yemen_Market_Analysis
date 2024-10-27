// src/components/discovery/Tutorials.js

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import { useDiscovery } from '../../context/DiscoveryContext';
import { tutorialConfig } from '../../config/tutorialConfig'; // Adjusted import

export const TutorialsModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [selectedTutorialId, setSelectedTutorialId] = useState(null);

  const handleTutorialSelect = useCallback((tutorialId) => {
    setSelectedTutorialId(tutorialId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedTutorialId(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={!isSmUp}
      maxWidth="md"
      fullWidth
      aria-labelledby="tutorials-modal-title"
    >
      <DialogTitle
        id="tutorials-modal-title"
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6">
          {selectedTutorialId ? 'Tutorial' : 'Interactive Tutorials'}
        </Typography>
        <IconButton aria-label="Close" onClick={handleClose} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {selectedTutorialId ? (
          <TutorialRenderer tutorialId={selectedTutorialId} onComplete={handleClose} />
        ) : (
          <TutorialsList onSelect={handleTutorialSelect} />
        )}
      </DialogContent>
    </Dialog>
  );
};

TutorialsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const TutorialsList = ({ onSelect }) => {
  const tutorials = tutorialConfig; // Adjusted to use tutorialConfig directly

  return (
    <List>
      {tutorials.map((tutorial) => (
        <ListItem key={tutorial.id} button onClick={() => onSelect(tutorial.id)}>
          <ListItemIcon>
            <PlayIcon />
          </ListItemIcon>
          <ListItemText primary={tutorial.title} secondary={tutorial.description} />
        </ListItem>
      ))}
    </List>
  );
};

TutorialsList.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

const TutorialRenderer = ({ tutorialId, onComplete }) => {
  const { completeTutorial } = useDiscovery();
  const [activeStep, setActiveStep] = useState(0);
  const tutorial = tutorialConfig.find((tut) => tut.id === tutorialId);

  const handleNext = () => {
    if (activeStep < tutorial.steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      completeTutorial(tutorialId);
      onComplete();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {tutorial.title}
      </Typography>
      <Stepper activeStep={activeStep} orientation="vertical">
        {tutorial.steps.map((step, index) => (
          <Step key={step.id}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>{step.content()}</Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ mr: 1 }}
                >
                  {index === tutorial.steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
                <Button disabled={index === 0} onClick={handleBack}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

TutorialRenderer.propTypes = {
  tutorialId: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
};
