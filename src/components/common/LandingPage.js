import React from 'react';
import { Typography, Button, Grid, Card, CardContent, CardActions, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { BarChart, MapPin, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(() => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
}));

const LandingPage = () => {
  const sections = [
    { title: 'ECM Analysis', icon: <BarChart size={48} />, description: 'Explore Error Correction Model results', link: '/ecm-analysis' },
    { title: 'Spatial Analysis', icon: <MapPin size={48} />, description: 'Visualize geographical market trends', link: '/spatial-analysis' },
    { title: 'Price Differential', icon: <TrendingUp size={48} />, description: 'Analyze price differences across markets', link: '/price-differential' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Yemen Market Analysis Dashboard
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Insights into Commodity Prices and Market Dynamics
        </Typography>
      </Box>
      
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {sections.map((section, index) => (
          <Grid item xs={12} md={4} key={index}>
            <StyledCard>
              <CardContent>
                <IconWrapper>{section.icon}</IconWrapper>
                <Typography variant="h5" component="div" gutterBottom>
                  {section.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={RouterLink} to={section.link}>Learn More</Button>
              </CardActions>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h4" component="h3" gutterBottom>
          Our Methodology
        </Typography>
        <Typography variant="body1" paragraph>
          We employ advanced econometric techniques, including Error Correction Models (ECM),
          spatial analysis, and price differential studies to provide comprehensive insights
          into Yemen&apos;s market dynamics.
        </Typography>
        <Button variant="contained" color="primary" size="large" component={RouterLink} to="/methodology" sx={{ mt: 2 }}>
          Explore Our Methodology
        </Button>
      </Box>
    </motion.div>
  );
};

export default LandingPage;