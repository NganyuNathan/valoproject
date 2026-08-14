import React from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import './Charts.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const FONT = { family: 'Manrope' };
const GREEN = '#0d3d2f';
const MINT = '#7fc8a3';
const AMBER = '#d98f3a';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { font: FONT, color: '#5c6b62' } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: FONT, color: '#8a9690' } },
    y: { grid: { color: '#eceae2' }, ticks: { font: FONT, color: '#8a9690' } },
  },
};

/** Line chart: applications submitted per month. */
export function ApplicationsByMonthChart({ labels, data }) {
  return (
    <div className="chart-wrap">
      <Line
        data={{
          labels,
          datasets: [{
            label: 'Applications',
            data,
            borderColor: GREEN,
            backgroundColor: 'rgba(13,61,47,0.12)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
          }],
        }}
        options={baseOptions}
      />
    </div>
  );
}

/** Doughnut: application status breakdown. */
export function ApplicationStatusChart({ labels, data }) {
  return (
    <div className="chart-wrap chart-wrap--sm">
      <Doughnut
        data={{
          labels,
          datasets: [{ data, backgroundColor: [GREEN, MINT, AMBER, '#c1462f', '#8a9690'], borderWidth: 0 }],
        }}
        options={{ ...baseOptions, scales: undefined, cutout: '65%' }}
      />
    </div>
  );
}

/** Bar chart: reusable for internship categories / student registrations. */
export function BarChartWidget({ labels, data, label = 'Total' }) {
  return (
    <div className="chart-wrap">
      <Bar
        data={{ labels, datasets: [{ label, data, backgroundColor: GREEN, borderRadius: 6, maxBarThickness: 34 }] }}
        options={baseOptions}
      />
    </div>
  );
}
