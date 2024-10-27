// src/components/analysis/tvmii/TVMIITutorial.js

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';

const steps = [
  {
    label: 'Introduction',
    description:
      'The Time-Varying Market Integration Index (TV-MII) assesses how well markets are integrated over time for a specific commodity.',
  },
  {
    label: 'Methodology',
    description:
      'The TV-MII is calculated using advanced econometric models that account for dynamic changes in market relationships.',
  },
  {
    label: 'Interpreting Results',
    description:
      'Values closer to 1 indicate strong integration, while values closer to 0 suggest weak integration.',
  },
  {
    label: 'Policy Implications',
    description:
      'Understanding market integration helps in formulating policies to enhance market efficiency and food security.',
  },
];

const TVMIITutorial = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setActiveStep(0);
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  return (
    <>
      <Button variant="outlined" onClick={handleOpen}>
        Tutorial
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>TV-MII Analysis Tutorial</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2">{step.description}</Typography>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={index === steps.length - 1}
                    >
                      {index === steps.length - 1 ? 'Finish' : 'Next'}
                    </Button>
                  </div>
                </StepContent>
              </Step>
            ))}
          </Stepper>
          {activeStep === steps.length && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              You have completed the tutorial.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close Tutorial
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TVMIITutorial;
