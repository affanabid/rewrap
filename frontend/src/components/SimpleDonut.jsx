// src/components/SimpleDonut.jsx
import Chart from 'react-apexcharts';
import { COLORS } from '@/constants/chart.constant';

const SimpleDonut = ({ series, labels }) => {
  return (
    <Chart
      options={{
        colors: COLORS,
        labels: labels,
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: {
                width: 200,
              },
              legend: {
                position: 'bottom',
              },
            },
          },
        ],
      }}
      series={series}
      height={300}
      type="donut"
    />
  );
};

export default SimpleDonut;
