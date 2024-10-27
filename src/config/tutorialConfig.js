// src/config/tutorialConfig.js

import { Typography } from '@mui/material';
import {
  PriceDiffDemo,
  ECMDemo,
  SpatialDemo,
  TVMIIDemo,
} from '../components/discovery/demos/Demos';

import Exercises from '../components/discovery/exercises/Exercises';

export const tutorialConfig = [
  {
    id: 'marketAnalysis',
    title: 'Market Analysis Tutorial',
    description: 'Learn how to analyze market data and interpret results.',
    duration: '30 minutes',
    level: 'intermediate',
    steps: [
      {
        id: 'intro',
        label: 'Introduction',
        content: () => (
          <Typography>
            Welcome to the Market Analysis Tutorial. In this tutorial, you will learn how to analyze market data and interpret results using various analytical tools.
          </Typography>
        ),
      },
      {
        id: 'price-diff-demo',
        label: 'Price Differential Analysis Demo',
        content: () => <PriceDiffDemo />,
      },
      {
        id: 'price-diff-exercise',
        label: 'Interactive Exercise: Price Differential Analysis',
        content: () => <Exercises exerciseType="priceDiff" />,
      },
      {
        id: 'ecm-demo',
        label: 'Error Correction Model (ECM) Analysis Demo',
        content: () => <ECMDemo />,
      },
      {
        id: 'ecm-exercise',
        label: 'Interactive Exercise: ECM Analysis',
        content: () => <Exercises exerciseType="ecm" />,
      },
      {
        id: 'spatial-demo',
        label: 'Spatial Analysis Demo',
        content: () => <SpatialDemo />,
      },
      {
        id: 'spatial-exercise',
        label: 'Interactive Exercise: Spatial Analysis',
        content: () => <Exercises exerciseType="spatial" />,
      },
      {
        id: 'tvmii-demo',
        label: 'TV-MII Analysis Demo',
        content: () => <TVMIIDemo />,
      },
      {
        id: 'tvmii-exercise',
        label: 'Interactive Exercise: TV-MII Analysis',
        content: () => <Exercises exerciseType="tvmii" />,
      },
      {
        id: 'conclusion',
        label: 'Conclusion',
        content: () => (
          <Typography>
            Congratulations! You've completed the Market Analysis Tutorial. You should now have a better understanding of how to perform and interpret various market analyses.
          </Typography>
        ),
      },
    ],
  },
];
