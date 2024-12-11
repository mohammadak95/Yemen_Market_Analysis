// src/components/common/ErrorDisplay.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Collapse,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.error.dark, 0.2)
    : alpha(theme.palette.error.light, 0.1),
  border: `1px solid ${theme.palette.mode === 'dark' 
    ? theme.palette.error.dark 
    : theme.palette.error.light}`,
  color: theme.palette.error.main,
  marginTop: theme.spacing(2),
  transition: theme.transitions.create(
    ['background-color', 'border-color', 'box-shadow'],
    {
      duration: theme.transitions.duration.short,
    }
  ),
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? `0 0 10px ${alpha(theme.palette.error.main, 0.3)}`
      : `0 0 10px ${alpha(theme.palette.error.light, 0.2)}`,
  }
}));

const DetailBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.1)
    : alpha(theme.palette.background.paper, 0.1),
  borderRadius: theme.shape.borderRadius,
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  whiteSpace: 'pre-wrap',
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(
    ['background-color', 'border-color'],
    {
      duration: theme.transitions.duration.short,
    }
  ),
}));

const ErrorDisplay = ({ 
  error,
  title = 'Error',
  onRetry,
  showDetails = false,
  className
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const errorDetails = typeof error === 'object' ? error?.details : null;

  if (!error) return null;

  return (
    <StyledPaper className={className} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              color: theme.palette.error.main,
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="body1" 
            gutterBottom
            sx={{ 
              color: theme.palette.text.primary,
              opacity: 0.9,
            }}
          >
            {errorMessage}
          </Typography>
          
          {errorDetails && showDetails && (
            <>
              <Button
                size="small"
                onClick={() => setExpanded(!expanded)}
                startIcon={expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                sx={{ 
                  mt: 1, 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? alpha(theme.palette.common.white, 0.05)
                      : alpha(theme.palette.common.black, 0.05),
                  }
                }}
              >
                {expanded ? 'Hide' : 'Show'} Details
              </Button>
              
              <Collapse in={expanded}>
                <DetailBox>
                  {typeof errorDetails === 'string' 
                    ? errorDetails 
                    : JSON.stringify(errorDetails, null, 2)}
                </DetailBox>
              </Collapse>
            </>
          )}
        </Box>
        
        {onRetry && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw size={18} />}
            onClick={onRetry}
            sx={{ 
              color: theme.palette.error.main,
              borderColor: theme.palette.error.main,
              '&:hover': {
                borderColor: theme.palette.error.dark,
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.error.main, 0.1)
                  : alpha(theme.palette.error.light, 0.1),
              },
              transition: theme.transitions.create(
                ['background-color', 'border-color', 'color'],
                {
                  duration: theme.transitions.duration.short,
                }
              ),
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
