// src/components/analysis/tvmii/TVMIITutorial.js

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  useTheme,
} from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import InteractiveDemoContainer from '../../discovery/InteractiveDemoContainer';

// Import Material-UI Icons
import InfoIcon from '@mui/icons-material/Info';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import InsightsIcon from '@mui/icons-material/Insights';

const TVMIITutorial = ({ onComplete }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = useCallback(() => {
    setActiveStep((prevStep) => {
      if (prevStep === tutorialSteps.length - 1) {
        onComplete?.();
        return prevStep;
      }
      return prevStep + 1;
    });
  }, [onComplete]);

  const handleBack = useCallback(() => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  }, []);

  const tutorialSteps = useMemo(
    () => [
      {
        id: 'introduction',
        label: 'Introduction to TV-MII',
        icon: (
          <InfoIcon
            style={{
              color:
                activeStep === 0
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
              fontSize: 24,
            }}
          />
        ),
        content: (
          <Box>
            <Typography variant="body1" paragraph>
              The Time-Varying Market Integration Index (TV-MII) is a dynamic measure that quantifies how well different markets are integrated over time. It helps us understand:
            </Typography>
            <ul>
              <li>How market relationships evolve</li>
              <li>The impact of external factors on market integration</li>
              <li>Effectiveness of market policies</li>
              <li>Potential arbitrage opportunities</li>
            </ul>
            <Alert severity="info" sx={{ mt: 2 }}>
              TV-MII values range from 0 (no integration) to 1 (perfect integration)
            </Alert>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Key Concepts:
                </Typography>
                <Typography variant="body2" paragraph>
                  Market integration refers to the degree to which different markets are connected, and how price signals are transmitted between them. The TV-MII captures this relationship dynamically, allowing us to see how it changes over time.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  The Basic Formula:
                </Typography>
                <BlockMath>
                  {`TV\\text{-}MII_{t} = \\frac{\\text{Cov}(P_{1t}, P_{2t})}{\\sqrt{\\text{Var}(P_{1t})\\text{Var}(P_{2t})}}`}
                </BlockMath>
                <Typography variant="body2">
                  Where <InlineMath>{`P_{1t}`}</InlineMath> and <InlineMath>{`P_{2t}`}</InlineMath> are prices in markets 1 and 2 at time t.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ),
      },
      {
        id: 'understanding-levels',
        label: 'Understanding Integration Levels',
        icon: (
          <IntegrationInstructionsIcon
            style={{
              color:
                activeStep === 1
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
              fontSize: 24,
            }}
          />
        ),
        content: (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Integration Level Classifications
            </Typography>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      High Integration (TV-MII {'>'} 0.7)
                    </Typography>
                    <Typography variant="body2">
                      • Strong price transmission between markets
                      <br />
                      • Efficient market functioning
                      <br />
                      • Limited arbitrage opportunities
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Moderate Integration (0.3 ≤ TV-MII ≤ 0.7)
                    </Typography>
                    <Typography variant="body2">
                      • Partial price transmission
                      <br />
                      • Some market barriers present
                      <br />
                      • Moderate arbitrage opportunities
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      Low Integration (TV-MII {'<'} 0.3)
                    </Typography>
                    <Typography variant="body2">
                      • Poor price transmission
                      <br />
                      • Significant market barriers
                      <br />
                      • High arbitrage opportunities
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ),
      },
      {
        id: 'interpreting-variations',
        label: 'Interpreting Time Variations',
        icon: (
          <InsightsIcon
            style={{
              color:
                activeStep === 2
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
              fontSize: 24,
            }}
          />
        ),
        content: (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Understanding Temporal Patterns
            </Typography>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body2" paragraph>
                  TV-MII values typically show various patterns over time:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      1. Long-term Trends
                    </Typography>
                    <Typography variant="body2">
                      • Gradual increases suggest improving market conditions
                      <br />
                      • Decreasing trends may indicate developing barriers
                      <br />
                      • Stable trends suggest mature market relationships
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      2. Seasonal Patterns
                    </Typography>
                    <Typography variant="body2">
                      • Regular fluctuations with seasons
                      <br />
                      • Often related to agricultural cycles
                      <br />
                      • Transportation availability
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ),
      },
    ],
    [activeStep, theme.palette.primary.main, theme.palette.text.secondary]
  );

  return (
    <InteractiveDemoContainer
      title="Understanding TV-MII Analysis"
      description="Learn how to interpret and use the Time-Varying Market Integration Index."
      steps={tutorialSteps}
      onComplete={onComplete}
    >
      <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
        {tutorialSteps.map((step, index) => (
          <Step key={step.id}>
            <StepLabel icon={step.icon}>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            <StepContent>
              {step.content}
              <Box sx={{ mb: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ mt: 1, mr: 1 }}
                >
                  {index === tutorialSteps.length - 1 ? 'Finish' : 'Continue'}
                </Button>
                <Button
                  disabled={index === 0}
                  onClick={handleBack}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </InteractiveDemoContainer>
  );
};

TVMIITutorial.propTypes = {
  onComplete: PropTypes.func,
};

export default TVMIITutorial;
