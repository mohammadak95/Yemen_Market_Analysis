// src/components/price-differential-analysis/PriceDifferentialTutorial.js

import React, { useState } from 'react';
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

const PriceDifferentialTutorial = () => {
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
        aria-label="Open Price Differential Tutorial"
      >
        📘 Learn About Price Differential Analysis
      </Typography>
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
            <Typography variant="subtitle1" gutterBottom>
              What is Price Differential Analysis?
            </Typography>
            <Typography variant="body2" gutterBottom>
              Price Differential Analysis examines the differences in commodity prices between two markets over time. It helps identify pricing disparities, potential arbitrage opportunities, and the impact of external factors such as transportation costs, tariffs, or market inefficiencies.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Key Components:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Price Differential:" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  The difference in prices of a commodity between two markets at the same time.
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Regression Analysis:" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  A statistical method used to model the relationship between the price differential and influencing factors.
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Diagnostics Tests:" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Statistical tests to validate the assumptions of the regression model.
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Market Pair Information:" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Details about the selected markets, such as distance, correlation, and common dates.
                </Typography>
              </ListItem>
            </List>
            <Typography variant="subtitle1" gutterBottom>
              Interpretation:
            </Typography>
            <Typography variant="body2" gutterBottom>
              Understanding the price differential can provide insights into market dynamics, supply and demand factors, and the effectiveness of market integration. Significant price differentials may indicate barriers to trade, inefficiencies, or opportunities for market intervention.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Further Reading:
            </Typography>
            <Typography variant="body2" gutterBottom>
              For a deeper understanding of Price Differential Analysis, refer to:
              <ul>
                <li>
                  <a href="https://en.wikipedia.org/wiki/Price_differential" target="_blank" rel="noopener noreferrer">
                    Wikipedia: Price Differential
                  </a>
                </li>
                <li>
                  <a href="https://www.investopedia.com/terms/p/price-differential.asp" target="_blank" rel="noopener noreferrer">
                    Investopedia: Price Differential
                  </a>
                </li>
              </ul>
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" aria-label="Close Price Differential Tutorial">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PriceDifferentialTutorial;