// src/components/ecm-analysis/ECMTutorial.js

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography, List, ListItem, ListItemText } from '@mui/material';

const ECMTutorial = () => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Typography
        variant="body1"
        sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
        onClick={handleClickOpen}
        aria-label="Open ECM Tutorial"
      >
        📘 Learn About the Error Correction Model (ECM)
      </Typography>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="ecm-tutorial-title"
        aria-describedby="ecm-tutorial-description"
      >
        <DialogTitle id="ecm-tutorial-title">Understanding the Error Correction Model (ECM)</DialogTitle>
        <DialogContent dividers>
          <DialogContentText id="ecm-tutorial-description" component="div">
            <Typography variant="subtitle1" gutterBottom>
              What is ECM?
            </Typography>
            <Typography variant="body2" gutterBottom>
              The Error Correction Model (ECM) is a statistical model that integrates both short-term dynamics and long-term equilibrium relationships between variables. It is particularly useful in time series analysis where variables are cointegrated.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              ECM Formula:
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Δy<sub>t</sub> = α(y<sub>t-1</sub> - βx<sub>t-1</sub>) + γΔx<sub>t</sub> + ε<sub>t</sub></strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Δy<sub>t</sub>: Change in the dependent variable at time t" />
              </ListItem>
              <ListItem>
                <ListItemText primary="y<sub>t-1</sub>: Level of the dependent variable at time t-1" />
              </ListItem>
              <ListItem>
                <ListItemText primary="x<sub>t-1</sub>: Level of the independent variable at time t-1" />
              </ListItem>
              <ListItem>
                <ListItemText primary="α: Speed of adjustment to equilibrium" />
              </ListItem>
              <ListItem>
                <ListItemText primary="β: Long-run relationship coefficient" />
              </ListItem>
              <ListItem>
                <ListItemText primary="γ: Short-term dynamics coefficient" />
              </ListItem>
              <ListItem>
                <ListItemText primary="ε<sub>t</sub>: Error term" />
              </ListItem>
            </List>
            <Typography variant="subtitle1" gutterBottom>
              Key Components:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Short-Term Dynamics (Δx<sub>t</sub>):" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Captures the immediate effect of changes in the independent variable on the dependent variable.
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Error Correction Term (α(y<sub>t-1</sub> - βx<sub>t-1</sub>)):" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Represents the speed at which the dependent variable returns to equilibrium after a shock. A significant α indicates a strong adjustment towards the long-term relationship.
                </Typography>
              </ListItem>
            </List>
            <Typography variant="subtitle1" gutterBottom>
              Why Use ECM?
            </Typography>
            <Typography variant="body2" gutterBottom>
              ECM is beneficial for:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Capturing both short-term and long-term relationships." />
              </ListItem>
              <ListItem>
                <ListItemText primary="Ensuring that the model is not spurious by incorporating cointegration." />
              </ListItem>
              <ListItem>
                <ListItemText primary="Providing insights into the speed of adjustment towards equilibrium." />
              </ListItem>
            </List>
            <Typography variant="subtitle1" gutterBottom>
              Further Reading:
            </Typography>
            <Typography variant="body2" gutterBottom>
              For a deeper understanding of ECM, refer to:
              <ul>
                <li>
                  <a href="https://en.wikipedia.org/wiki/Error_correction_model" target="_blank" rel="noopener noreferrer">
                    Wikipedia: Error Correction Model
                  </a>
                </li>
                <li>
                  <a href="https://www.statisticssolutions.com/what-is-an-error-correction-model/" target="_blank" rel="noopener noreferrer">
                    Statistics Solutions: What is an Error Correction Model?
                  </a>
                </li>
              </ul>
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" aria-label="Close ECM Tutorial">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ECMTutorial;
