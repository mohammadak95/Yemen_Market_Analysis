// src/components/tvmii-analysis/TVMIITutorial.js

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const TVMIITutorial = () => {
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
        📘 Learn About the Time-Variant Market Integration Index (TV-MII)
      </Typography>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="tvmii-tutorial-title"
        aria-describedby="tvmii-tutorial-description"
      >
        <DialogTitle id="tvmii-tutorial-title">
          Understanding the Time-Variant Market Integration Index (TV-MII)
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="tvmii-tutorial-description">
            The Time-Variant Market Integration Index (TV-MII) is a dynamic measure of market integration that captures how the degree of integration between markets changes over time.
          </DialogContentText>
          <List>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Definition"
                secondary="TV-MII quantifies the extent to which prices in different markets move together, accounting for temporal variations."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Interpretation"
                secondary="TV-MII values range from 0 to 1. Higher values indicate stronger market integration, while lower values suggest weaker integration."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Calculation"
                secondary="TV-MII is computed using a state-space model that accounts for time-varying coefficients in the relationship between market prices."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Applications"
                secondary="TV-MII helps in understanding how market integration evolves over time, which can be influenced by factors such as conflict, policy changes, or infrastructure improvements."
              />
            </ListItem>
          </List>
          <Typography variant="body1" gutterBottom>
            Use the TV-MII analysis to:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="• Identify trends in market integration over time"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="• Compare integration levels between different market pairs"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="• Assess the impact of external events on market integration"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="• Inform policy decisions aimed at improving market efficiency"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TVMIITutorial;