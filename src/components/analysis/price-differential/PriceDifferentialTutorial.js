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
  Box,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import { School as SchoolIcon, Info as InfoIcon } from '@mui/icons-material';

const steps = [
  {
    label: 'Understanding Price Differentials',
    content: `Price Differential Analysis examines commodity price variations between markets,
      revealing patterns in market integration and efficiency. This analysis helps identify
      barriers to trade and opportunities for market improvement.`,
    tooltip: 'Learn the basics of price differential analysis',
  },
  {
    label: 'Statistical Methodology',
    content: `We employ robust statistical methods including:
      • Stationarity tests to check price stability
      • Cointegration analysis for long-term relationships
      • Regression analysis with conflict and distance factors
      • Diagnostic tests for result validation`,
    tooltip: 'Explore the statistical methods used',
  },
  {
    label: 'Interpretation Guide',
    content: `Learn to interpret results through:
      • Statistical significance indicators
      • Long-term relationship assessment
      • Market integration metrics
      • Impact of conflict and distance`,
    tooltip: 'Understanding what the results mean',
  },
  {
    label: 'Applied Examples',
    content: `Examine real-world cases showing:
      • How conflict affects market integration
      • Distance impacts on price relationships
      • Seasonal price pattern analysis
      • Market efficiency assessment`,
    tooltip: 'See real-world applications',
  },
];

const PriceDifferentialTutorial = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const styles = {
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    },
    stepContent: {
      pb: 2,
      pr: 2,
    },
    actions: {
      px: 2,
      py: 1,
    },
    navigation: {
      mt: 2,
      display: 'flex',
      gap: 1,
    },
  };

  const handleStepChange = (step) => {
    setActiveStep(step);
  };

  return (
    <>
      <Button 
        variant="outlined" 
        onClick={() => setOpen(true)}
        sx={styles.button}
      >
        <SchoolIcon fontSize="small" />
        Tutorial
      </Button>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Price Differential Analysis Guide
            </Typography>
            <Tooltip title="Interactive tutorial guide">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stepper 
            activeStep={activeStep} 
            orientation="vertical" 
            nonLinear
          >
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Tooltip title={step.tooltip}>
                      <InfoIcon fontSize="small" sx={{ ml: 1, color: theme.palette.text.secondary }} />
                    </Tooltip>
                  }
                >
                  <Typography variant="subtitle1">
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent TransitionProps={{ unmountOnExit: false }}>
                  <Box sx={styles.stepContent}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {step.content}
                    </Typography>
                    <Box sx={styles.navigation}>
                      <Button
                        disabled={index === 0}
                        onClick={() => handleStepChange(index - 1)}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleStepChange(index + 1)}
                        disabled={index === steps.length - 1}
                      >
                        Continue
                      </Button>
                    </Box>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>

        <DialogActions sx={styles.actions}>
          <Button onClick={() => setOpen(false)} color="primary">
            Close Guide
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(PriceDifferentialTutorial);