import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Divider,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MethodologyContentWrapper from './MethodologyContentWrapper';
import { useTheme } from '@mui/material/styles';

const MethodologyModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={!isSmUp}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          position: 'relative',
        }}
      >
        <Typography variant="h6">Methodology</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'inherit',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Divider />
        <Box sx={{ p: 2, maxHeight: { xs: 'calc(100vh - 100px)', sm: '60vh' }, overflowY: 'auto' }}>
          <MethodologyContentWrapper />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

MethodologyModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MethodologyModal;