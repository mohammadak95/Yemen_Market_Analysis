// src/components/common/ErrorDisplay.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Collapse,
  Paper
} from '@mui/material';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.error.light,
  color: theme.palette.error.contrastText,
  marginTop: theme.spacing(2)
}));

const ErrorDisplay = ({ 
  error,
  title = 'Error',
  onRetry,
  showDetails = false,
  className
}) => {
  const [expanded, setExpanded] = useState(false);
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const errorDetails = typeof error === 'object' ? error?.details : null;

  if (!error) return null;

  return (
    <StyledPaper className={className} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" gutterBottom>
            {errorMessage}
          </Typography>
          
          {errorDetails && showDetails && (
            <>
              <Button
                size="small"
                onClick={() => setExpanded(!expanded)}
                startIcon={expanded ? <ChevronUp /> : <ChevronDown />}
                sx={{ mt: 1, color: 'inherit' }}
              >
                {expanded ? 'Hide' : 'Show'} Details
              </Button>
              
              <Collapse in={expanded}>
                <Box 
                  sx={{ 
                    mt: 2,
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {typeof errorDetails === 'string' 
                    ? errorDetails 
                    : JSON.stringify(errorDetails, null, 2)}
                </Box>
              </Collapse>
            </>
          )}
        </Box>
        
        {onRetry && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw />}
            onClick={onRetry}
            sx={{ 
              color: 'inherit',
              borderColor: 'currentColor',
              '&:hover': {
                borderColor: 'currentColor',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            Retry
          </Button>
        )}
      </Box>
    </StyledPaper>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      message: PropTypes.string.isRequired,
      details: PropTypes.any
    })
  ]).isRequired,
  title: PropTypes.string,
  onRetry: PropTypes.func,
  showDetails: PropTypes.bool,
  className: PropTypes.string
};

export default ErrorDisplay;