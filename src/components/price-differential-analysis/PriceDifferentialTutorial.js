// src/components/price-differential-analysis/PriceDifferentialTutorial.js

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

const PriceDifferentialTutorial = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  return (
    <>
      <Button variant="outlined" onClick={handleOpen}>
        Learn about Price Differential Analysis
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="price-differential-tutorial-title"
        aria-describedby="price-differential-tutorial-description"
      >
        <DialogTitle id="price-differential-tutorial-title">
          Understanding Price Differential Analysis
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText id="price-differential-tutorial-description" component="div">
            <Typography variant="body1" gutterBottom>
              <strong>What is Price Differential Analysis?</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              Price Differential Analysis examines the differences in commodity prices between two markets over time. It helps identify trends, market inefficiencies, and the impact of external factors such as conflict intensity.
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Key Components:</strong>
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  <strong>Price Differential Chart:</strong> Visualizes the price differences over time.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Regression Results:</strong> Analyzes trends and statistical significance.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Diagnostics:</strong> Provides statistical tests to validate the analysis.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Market Pair Information:</strong> Offers context about the markets being compared.
                </Typography>
              </li>
            </ul>
            <Typography variant="body1" gutterBottom>
              <strong>How to Interpret the Results:</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              - A positive price differential indicates that the base market has higher prices for the commodity compared to the comparison market.
            </Typography>
            <Typography variant="body2" gutterBottom>
              - Statistical significance in the regression results suggests a meaningful trend over time.
            </Typography>
            <Typography variant="body2" gutterBottom>
              - Diagnostics help ensure that the data meets the assumptions necessary for valid statistical inference.
            </Typography>
            <Typography variant="body2" gutterBottom>
              - Understanding the context of the markets, such as distance and conflict intensity, provides insights into the factors influencing price differentials.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PriceDifferentialTutorial;
