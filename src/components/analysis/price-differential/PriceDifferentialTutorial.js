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
  Paper,
} from '@mui/material';
import { School as SchoolIcon, Info as InfoIcon } from '@mui/icons-material';

const steps = [
  {
    label: 'Understanding Price Differentials',
    content: `Price Differential Analysis examines commodity price variations between markets,
      helping understand market integration and efficiency. Key concepts include:
      
      • Price spread between markets
      • Temporal price relationships
      • Market integration patterns
      • Trade barrier identification
      
      This analysis provides insights into market efficiency and potential areas for improvement.`,
    tooltip: 'Learn the basics of price differential analysis',
  },
  {
    label: 'Enhanced Statistical Methods',
    content: `Our comprehensive statistical approach includes:

      Stationarity Analysis:
      • Augmented Dickey-Fuller (ADF) Test: Checks for unit roots
      • KPSS Test: Confirms trend stationarity
      • Combined interpretation for robust results
      
      Cointegration Analysis:
      • Tests long-term price relationships
      • Evaluates market integration strength
      • Identifies equilibrium patterns
      
      Regression Analysis:
      • Distance effects on price spread
      • Conflict impact assessment
      • Market efficiency metrics
      
      Advanced Diagnostics:
      • Residual analysis
      • Model validation tests
      • Confidence interval estimation`,
    tooltip: 'Explore our enhanced statistical methodology',
  },
  {
    label: 'Interpreting Results',
    content: `Learn to interpret comprehensive analysis results:

      Market Integration Assessment:
      • Strong: Both ADF and KPSS confirm stationarity
      • Moderate: Mixed test results
      • Weak: Non-stationary price relationships
      
      Cointegration Interpretation:
      • p-value < 0.01: Very strong evidence
      • p-value < 0.05: Strong evidence
      • p-value ≥ 0.05: Limited evidence
      
      Impact Factors:
      • Geographic distance effects
      • Conflict intensity influence
      • Seasonal patterns
      • Market-specific characteristics`,
    tooltip: 'Understanding the enhanced analysis results',
  },
  {
    label: 'Visual Analysis Tools',
    content: `Our interactive visualization tools include:

      Price Differential Charts:
      • Time series visualization
      • Confidence intervals
      • Trend identification
      • Seasonal patterns
      
      Statistical Displays:
      • Test result summaries
      • Integration metrics
      • Diagnostic indicators
      • Market condition indicators
      
      Interactive Features:
      • Dynamic date selection
      • Market pair comparison
      • Customizable views
      • Detailed tooltips`,
    tooltip: 'Learn about visualization features',
  },
  {
    label: 'Practical Applications',
    content: `Real-world applications and insights:

      Market Integration:
      • Identifying trade barriers
      • Assessing price transmission
      • Evaluating market efficiency
      
      Policy Implications:
      • Infrastructure development needs
      • Trade policy recommendations
      • Market intervention strategies
      
      Risk Assessment:
      • Market vulnerability analysis
      • Conflict impact evaluation
      • Geographic barrier effects
      
      Development Planning:
      • Market development priorities
      • Infrastructure investment needs
      • Policy intervention points`,
    tooltip: 'See practical applications and implications',
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
    contentBox: {
      p: 2,
      bgcolor: theme.palette.background.default,
      borderRadius: 1,
      my: 2,
      whiteSpace: 'pre-line',
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
    dialogTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
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
          <Box sx={styles.dialogTitle}>
            <Typography variant="h6">
              Enhanced Price Differential Analysis Guide
            </Typography>
            <Tooltip title="Comprehensive tutorial on market analysis methods">
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
                    <Paper variant="outlined" sx={styles.contentBox}>
                      <Typography variant="body2">
                        {step.content}
                      </Typography>
                    </Paper>
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
