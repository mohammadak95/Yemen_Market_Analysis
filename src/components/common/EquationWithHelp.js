//src/components/common/EquationWithHelp.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const EquationWithHelp = ({
  latex,
  description,
  variables,
  title,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          sx={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </IconButton>
      </Box>

      {latex && (
        <Box sx={{ my: 2 }}>
          <BlockMath>{latex}</BlockMath>
        </Box>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {description && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" paragraph>
                {description}
              </Typography>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {variables && Object.keys(variables).length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Variables
              </Typography>
              <List dense>
                {Object.entries(variables).map(([symbol, description]) => (
                  <ListItem key={symbol}>
                    <ListItemText
                      primary={<InlineMath>{symbol}</InlineMath>}
                      secondary={description}
                      primaryTypographyProps={{
                        component: 'div',
                        sx: { mb: 0.5 },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

EquationWithHelp.propTypes = {
  latex: PropTypes.string,
  description: PropTypes.string,
  variables: PropTypes.objectOf(PropTypes.string),
  title: PropTypes.string.isRequired,
  componentType: PropTypes.string.isRequired,
};

export default EquationWithHelp;