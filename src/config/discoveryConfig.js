// src/config/discoveryConfig.js

import { ECMDemo } from '../components/discovery/demos/Demos';
import { PriceDiffDemo } from '../components/discovery/demos/Demos';
import { SpatialDemo } from '../components/discovery/demos/Demos';
import { TVMIIDemo } from '../components/discovery/demos/Demos';

export const discoveryPaths = [
  {
    id: 'ecm',
    title: 'Error Correction Model (ECM)',
    icon: 'TrendingUp',
    sections: [
      {
        id: 'ecm-intro',
        title: 'Introduction to ECM',
        type: 'tutorial',
        component: ECMDemo,
      },
      {
        id: 'ecm-practice',
        title: 'ECM Practice Exercise',
        type: 'exercise',
      },
    ],
  },
  {
    id: 'price-differential',
    title: 'Price Differential Analysis',
    icon: 'PriceChange',
    sections: [
      {
        id: 'price-diff-intro',
        title: 'Understanding Price Differentials',
        type: 'tutorial',
        component: PriceDiffDemo,
      },
      {
        id: 'price-diff-practice',
        title: 'Price Differential Exercise',
        type: 'exercise',
      },
    ],
  },
  {
    id: 'spatial-analysis',
    title: 'Spatial Analysis',
    icon: 'Map',
    sections: [
      {
        id: 'spatial-intro',
        title: 'Introduction to Spatial Analysis',
        type: 'tutorial',
        component: SpatialDemo,
      },
      {
        id: 'spatial-practice',
        title: 'Spatial Analysis Exercise',
        type: 'exercise',
      },
    ],
  },
  {
    id: 'tvmii',
    title: 'Time-Varying Market Integration Index',
    icon: 'Insights',
    sections: [
      {
        id: 'tvmii-intro',
        title: 'Understanding TV-MII',
        type: 'tutorial',
        component: TVMIIDemo,
      },
      {
        id: 'tvmii-practice',
        title: 'TV-MII Practice Exercise',
        type: 'exercise',
      },
    ],
  },
];
