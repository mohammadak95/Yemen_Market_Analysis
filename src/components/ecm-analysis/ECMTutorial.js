import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography } from '@mui/material';

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
      >
        📘 Learn About the Error Correction Model (ECM)
      </Typography>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>Understanding the Error Correction Model (ECM)</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The Error Correction Model (ECM) integrates both short-term dynamics and long-term equilibrium in a single framework. It allows you to analyze how variables adjust towards equilibrium after a shock. Here&apos;s a breakdown of its components:
          </DialogContentText>
          <ul>
            <li>
              <strong>Short-Term Dynamics:</strong> Captures immediate responses to changes.
            </li>
            <li>
              <strong>Long-Term Equilibrium:</strong> Represents the stable relationship between variables.
            </li>
            <li>
              <strong>Error Correction Term:</strong> Indicates the speed at which variables return to equilibrium.
            </li>
          </ul>
          <Typography variant="body2" sx={{ mt: 2 }}>
            By understanding ECM, you can gain insights into both the immediate and sustained impacts of shocks on commodity prices and conflict intensity.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ECMTutorial;