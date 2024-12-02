// src/components/WelcomeModal.js
import React from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { setHasSeenWelcome, selectHasSeenWelcome } from '../../store/welcomeModalSlice';
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
  ListItemText,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const WelcomeModal = React.memo(({ open, onClose }) => {
  const dispatch = useDispatch();
  const hasSeenWelcome = useSelector(selectHasSeenWelcome);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCheckboxChange = (event) => {
    setDontShowAgain(event.target.checked);
  };

  const handleGetStarted = () => {
    if (dontShowAgain) {
      dispatch(setHasSeenWelcome(true));
    }
    onClose(dontShowAgain);
  };

  // Don't render if user has seen welcome
  if (hasSeenWelcome) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleGetStarted}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="welcome-modal-title"
      aria-describedby="welcome-modal-description"
    >
      <DialogTitle id="welcome-modal-title">
        Welcome to the Commodity and Conflict Analysis Dashboard
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText id="welcome-modal-description" component="div">
          <Typography variant="body1" gutterBottom>
            This dashboard allows you to explore the relationship between commodity prices and conflict intensity through interactive analyses and visualizations.
          </Typography>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            How to Use the Dashboard:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary={
                  <>
                    <strong>Select a Commodity:</strong> Use the dropdown menu in the sidebar to choose a commodity you&apos;re interested in analyzing.
                  </>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={
                  <>
                    <strong>Navigate Analyses:</strong> Explore different analyses such as Error Correction Model (ECM) and Price Differential Analysis using the buttons in the sidebar.
                  </>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={
                  <>
                    <strong>Interactive Charts:</strong> Hover over charts to see detailed information, and use the provided controls to customize your view.
                  </>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={
                  <>
                    <strong>Access Tutorials:</strong> Click on the &quot;Tutorials&quot; button in the sidebar to learn more about the methods used.
                  </>
                }
              />
            </ListItem>
          </List>
          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            We hope this dashboard provides valuable insights into commodity markets and conflict dynamics. If you have any questions or feedback, feel free to contact us.
          </Typography>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={handleCheckboxChange}
              color="primary"
            />
          }
          label="Don&apos;t show this again"
        />
        <Button onClick={handleGetStarted} variant="contained" color="primary" aria-label="Close Welcome Modal">
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
});

WelcomeModal.displayName = 'WelcomeModal';

WelcomeModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
