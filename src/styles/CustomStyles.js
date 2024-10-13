// src/styles/CustomStyles.js

import { styled } from '@mui/material/styles';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  Typography,
} from '@mui/material';

// Styled Dialog
export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: theme.palette.background.paper,
    backgroundSize: 'cover',
    color: theme.palette.text.primary,
    borderRadius: '12px',
    padding: theme.spacing(2),
    boxShadow: theme.shadows[5],
    width: '100%',
    maxWidth: '600px',
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
    },
  },
}));

// Styled Accordion
export const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  boxShadow: 'none',
  '&::before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 0,
  },
}));

// Styled Accordion Summary
export const StyledAccordionSummary = styled(AccordionSummary)(
  ({ theme }) => ({
    backgroundColor: theme.palette.primary.light,
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: '48px !important',
    '& .MuiAccordionSummary-content': {
      margin: '12px 0 !important',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '& .MuiAccordionSummary-expandIconWrapper': {
      color: theme.palette.primary.contrastText,
    },
  })
);

// Styled Accordion Details
export const StyledAccordionDetails = styled(AccordionDetails)(
  ({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  })
);

// Styled Section Title
export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.primary,
  textAlign: 'center',
  marginBottom: theme.spacing(2),
}));