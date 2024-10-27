// src/components/analysis/price-differential/PriceDifferentialTutorial.js

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
      'Price Differential Analysis examines the differences in commodity prices between two markets over time, providing insights into market integration and efficiency.',
  },
  {
    label: 'Methodology',
    description:
      'Our methodology involves collecting price data, performing statistical tests such as stationarity and cointegration tests, and conducting regression analysis with diagnostics to assess relationships.',
  },
  {
    label: 'Interpreting Results',
    description:
      'Interpretations are provided based on statistical significance, long-term relationships, and diagnostic tests, helping you understand the factors influencing price differentials.',
  },
  {
    label: 'Case Studies',
    description:
      'Explore case studies that illustrate how conflict intensity and distance impact market integration, using real data from selected market pairs.',
  },
];

const PriceDifferentialTutorial = () => {
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
        <DialogTitle>Price Differential Analysis Tutorial</DialogTitle>
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

export default PriceDifferentialTutorial;
