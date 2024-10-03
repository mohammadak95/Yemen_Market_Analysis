// Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/system';

const DashboardContainer = styled('div')`
  padding: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const Card = styled(Link)`
  padding: 20px;
  background-color: #fff;
  color: #333;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

const Dashboard = () => {
  return (
    <DashboardContainer>
      <Card to="/ecm">ECM Analysis</Card>
      <Card to="/price-diff">Price Differential Analysis</Card>
      <Card to="/spatial">Spatial Analysis</Card>
    </DashboardContainer>
  );
};

export default Dashboard;