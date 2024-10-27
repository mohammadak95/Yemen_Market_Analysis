//src/components/common/TechnicalTooltip.js

import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, IconButton } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    maxWidth: 300,
    fontSize: theme.typography.pxToRem(12),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[1],
    padding: theme.spacing(1.5),
    '& b': {
      color: theme.palette.primary.main,
    },
  },
}));

const TechnicalTooltip = ({
  componentType,
  element,
  tooltipContent,
  children,
  iconSize = 'small',
}) => {
  const content = tooltipContent || `Technical information for ${componentType} ${element}`;

  return children ? (
    <StyledTooltip title={content}>
      {children}
    </StyledTooltip>
  ) : (
    <StyledTooltip title={content}>
      <IconButton size={iconSize} sx={{ ml: 0.5 }}>
        <InfoIcon fontSize={iconSize} />
      </IconButton>
    </StyledTooltip>
  );
};

TechnicalTooltip.propTypes = {
  componentType: PropTypes.string.isRequired,
  element: PropTypes.string.isRequired,
  tooltipContent: PropTypes.node,
  children: PropTypes.node,
  iconSize: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default TechnicalTooltip;