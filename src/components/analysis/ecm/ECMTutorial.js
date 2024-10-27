// src/components/analysis/ecm/ECMTutorial.js

import React, { useState } from 'react';
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

const ECMTutorial = () => {
  const [open, setOpen] = useState(false);

  const handleToggleOpen = () => setOpen(!open);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 2 }} onClick={handleToggleOpen}>
        <Typography variant="body1" sx={{ color: 'primary.main' }}>
          Learn About the Error Correction Model (ECM)
        </Typography>
        <Tooltip title="Click to learn more about ECM">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        fullWidth
        maxWidth="md"
        aria-labelledby="ecm-tutorial-title"
      >
        <DialogTitle id="ecm-tutorial-title">Understanding the Error Correction Model (ECM)</DialogTitle>
        <DialogContent dividers>
          <DialogContentText component="div">
            {/* Tutorial content */}
            <Typography variant="subtitle1" gutterBottom>
              What is ECM?
            </Typography>
            <Typography variant="body2" gutterBottom>
              The Error Correction Model (ECM) is a statistical model that combines short-term dynamics with long-term equilibrium relationships between variables. It's particularly useful when dealing with non-stationary time series that are cointegrated.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Key Components
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  <strong>Adjustment Speed (Alpha):</strong> Indicates how quickly variables return to equilibrium after a shock.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Long-run Relationship (Beta):</strong> Represents the equilibrium relationship between variables.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Short-term Dynamics (Gamma):</strong> Captures immediate effects of changes in variables.
                </Typography>
              </li>
            </ul>
            <Typography variant="subtitle1" gutterBottom>
              Why Use ECM?
            </Typography>
            <Typography variant="body2">
              ECM allows us to model the relationship between variables that are both non-stationary and cointegrated, ensuring that the long-term equilibrium is maintained while capturing short-term fluctuations.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleToggleOpen} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ECMTutorial;
