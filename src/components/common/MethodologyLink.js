// src/components/common/MethodologyLink.js

import React from 'react';
import PropTypes from 'prop-types';
import { 
  Button, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { BookOpen, X } from 'lucide-react';
import { useMethodologyAccess } from '../../hooks/useMethodologyAccess';
import MethodologySection from '../methodology/MethodologySection';

const MethodologyLink = ({ 
  componentType,
  iconOnly = false,
  tooltip = "View Methodology",
  buttonText = "Learn More"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { 
    activeSection,
    isDialogOpen,
    openMethodologySection,
    closeMethodology 
  } = useMethodologyAccess();

  if (iconOnly) {
    return (
      <>
        <Tooltip title={tooltip}>
          <IconButton
            size="small"
            onClick={() => openMethodologySection(componentType)}
            aria-label="View methodology"
          >
            <BookOpen size={20} />
          </IconButton>
        </Tooltip>
        <MethodologyDialog
          open={isDialogOpen}
          onClose={closeMethodology}
          section={activeSection}
          isMobile={isMobile}
        />
      </>
    );
  }

  return (
    <>
      <Button
        startIcon={<BookOpen size={20} />}
        onClick={() => openMethodologySection(componentType)}
        variant="outlined"
        size="small"
      >
        {buttonText}
      </Button>
      <MethodologyDialog
        open={isDialogOpen}
        onClose={closeMethodology}
        section={activeSection}
        isMobile={isMobile}
      />
    </>
  );
};

const MethodologyDialog = ({ open, onClose, section, isMobile }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {section?.title || 'Methodology'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {section && <MethodologySection section={section} level={1} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

MethodologyDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  section: PropTypes.object,
  isMobile: PropTypes.bool.isRequired,
};

MethodologyLink.propTypes = {
  componentType: PropTypes.string.isRequired,
  iconOnly: PropTypes.bool,
  tooltip: PropTypes.string,
  buttonText: PropTypes.string,
};

export default MethodologyLink;