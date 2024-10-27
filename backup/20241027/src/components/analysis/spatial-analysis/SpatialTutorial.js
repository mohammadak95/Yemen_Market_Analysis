//src/components/spatial-analysis/SpatialTutorial.js


import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

const SpatialTutorial = ({ onComplete }) => {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    onComplete?.();
  };

  return (
    <>
      <Button variant="outlined" onClick={handleOpen}>
        Learn about Spatial Analysis
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="spatial-tutorial-title"
      >
        <DialogTitle id="spatial-tutorial-title">
          Understanding Spatial Analysis
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="h6" gutterBottom>
              Introduction to Spatial Analysis
            </Typography>
            <Typography paragraph>
              Spatial analysis examines how market dynamics vary across different geographic locations. 
              This analysis helps identify:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <li>Spatial price patterns</li>
              <li>Market clustering</li>
              <li>Geographic barriers to trade</li>
              <li>Regional market integration</li>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Key Components
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <li>
                <Typography variant="subtitle1" gutterBottom>
                  Choropleth Maps
                </Typography>
                <Typography>
                  Visualize price levels and changes across regions using color-coded maps
                </Typography>
              </li>
              <li>
                <Typography variant="subtitle1" gutterBottom>
                  Flow Network Analysis
                </Typography>
                <Typography>
                  Examine trade relationships and market connections between regions
                </Typography>
              </li>
              <li>
                <Typography variant="subtitle1" gutterBottom>
                  Market Clustering
                </Typography>
                <Typography>
                  Identify groups of markets with similar price behaviors
                </Typography>
              </li>
              <li>
                <Typography variant="subtitle1" gutterBottom>
                  Spatial Statistics
                </Typography>
                <Typography>
                  Quantify spatial relationships and patterns using statistical measures
                </Typography>
              </li>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Start Exploring
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

SpatialTutorial.propTypes = {
  onComplete: PropTypes.func,
};

export default SpatialTutorial;