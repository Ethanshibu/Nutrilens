import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip
);

export default function ShapChart({ shapValues }) {
  if (!shapValues || shapValues.length === 0) return null;

  const data = {
    labels: shapValues.map(s => s.feature),
    datasets: [
      {
        label: 'Impact on Risk Score',
        data: shapValues.map(s => s.impact),
        backgroundColor: shapValues.map(s => 
          s.impact > 0 ? 'rgba(220, 38, 38, 0.7)' : 'rgba(16, 185, 129, 0.7)'
        ),
        borderColor: shapValues.map(s => 
          s.impact > 0 ? 'rgb(220, 38, 38)' : 'rgb(16, 185, 129)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const rawValue = shapValues[context.dataIndex].value;
            const impact = context.raw > 0 ? "Increased risk" : "Decreased risk";
            return `Input Value: ${rawValue} | ${impact}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'SHAP Value (Impact)' },
        grid: { color: '#e5e7eb' }
      },
      y: { grid: { display: false } }
    }
  };

  return (
    <div className="report-section">
      <h3 className="section-title">🔍 Why was this score given?</h3>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
        This chart shows which ingredients or health factors pushed your risk score higher (red) or lower (green).
      </p>
      <div style={{ height: "300px", width: "100%" }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}