import React, { useEffect, useState } from 'react';
import { HiOutlineDownload } from 'react-icons/hi';
import { supabase } from '../../services/supabase';
import { BarChartWidget } from '../../components/Charts/Charts';
import './AdminTables.css';

const REPORT_TYPES = ['applications', 'students', 'companies', 'internships'];

export default function Reports() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    async function load() {
      const results = {};
      for (const table of REPORT_TYPES) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results[table] = count || 0;
      }
      setCounts(results);
    }
    load().catch(() => {});
  }, []);

  const exportReport = async (table) => {
    const { data } = await supabase.from(table).select('*');
    const csv = [Object.keys(data?.[0] || {}).join(','), ...(data || []).map((r) => Object.values(r).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${table}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="admin-header"><h1>Reports</h1></div>
      <div className="card chart-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Record counts</h3>
        <BarChartWidget labels={REPORT_TYPES.map((t) => t[0].toUpperCase() + t.slice(1))} data={REPORT_TYPES.map((t) => counts[t] || 0)} label="Records" />
      </div>
      <div className="card admin-table-wrap">
        <table className="table">
          <thead><tr><th>Report</th><th>Records</th><th></th></tr></thead>
          <tbody>
            {REPORT_TYPES.map((t) => (
              <tr key={t}>
                <td style={{ textTransform: 'capitalize' }}>{t}</td>
                <td>{counts[t] ?? '—'}</td>
                <td className="admin-table__actions"><button onClick={() => exportReport(t)} aria-label="Download"><HiOutlineDownload /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
