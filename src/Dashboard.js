// src/Dashboard.js
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import useData from './hooks/useData';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const MainContent = styled.main`
  flex-grow: 1;
  padding: 2rem;
  overflow-y: auto;
`;

const ChartContainer = styled.div`
  background: ${props => props.theme.chartBackground};
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CheckboxGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.borderColor};
  background-color: ${props => props.theme.backgroundColor};
  color: ${props => props.theme.textColor};
`;

const Dashboard = ({ selectedCommodity, selectedRegime }) => {
  const { data, loading, error } = useData();
  const [showConflictIntensity, setShowConflictIntensity] = useState(true);
  const [showResidual, setShowResidual] = useState(false);
  const [priceType, setPriceType] = useState('lcu');

  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || !selectedRegime) return null;

    const filteredData = data.features.filter(
      d => d.commodity === selectedCommodity && d.regime === selectedRegime
    ).sort((a, b) => a.date - b.date);

    return {
      labels: filteredData.map(d => d.date),
      datasets: [
        {
          label: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
          data: filteredData.map(d => priceType === 'lcu' ? d.price : d.usdprice),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
        ...(showConflictIntensity ? [{
          label: 'Conflict Intensity',
          data: filteredData.map(d => d.conflict_intensity),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
          fill: true,
        }] : []),
        ...(showResidual ? [{
          label: 'Residual',
          data: filteredData.map(d => d.residual),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y2',
        }] : []),
      ],
    };
  }, [data, selectedCommodity, selectedRegime, showConflictIntensity, showResidual, priceType]);

  const options = useMemo(() => ({
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month'
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)'
        }
      },
      y1: {
        type: 'linear',
        display: showConflictIntensity,
        position: 'right',
        title: {
          display: true,
          text: 'Conflict Intensity'
        },
        min: 0,
        max: 10,
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear',
        display: showResidual,
        position: 'right',
        title: {
          display: true,
          text: 'Residual'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => {
            return new Date(context[0].parsed.x).toLocaleDateString();
          }
        }
      }
    }
  }), [showConflictIntensity, showResidual, priceType]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!data) return <ErrorMessage message="No data available" />;

  return (
    <MainContent>
      <h1>Yemen Market Analysis Dashboard</h1>
      <Controls>
        <CheckboxGroup>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={showConflictIntensity}
              onChange={() => setShowConflictIntensity(!showConflictIntensity)}
            />
            Show Conflict Intensity
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={showResidual}
              onChange={() => setShowResidual(!showResidual)}
            />
            Show Residual
          </CheckboxLabel>
        </CheckboxGroup>
        <Select value={priceType} onChange={(e) => setPriceType(e.target.value)}>
          <option value="lcu">Price in LCU</option>
          <option value="usd">Price in US$</option>
        </Select>
      </Controls>
      <ChartContainer>
        {chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <p>Please select a commodity and regime to display data.</p>
        )}
      </ChartContainer>
    </MainContent>
  );
};

Dashboard.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default Dashboard;