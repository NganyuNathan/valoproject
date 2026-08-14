import React, { useEffect, useState } from 'react';
import { HiOutlineUsers, HiOutlineOfficeBuilding, HiOutlineBriefcase, HiOutlineClipboardList, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';
import { supabase } from '../../services/supabase';
import { ApplicationsByMonthChart, BarChartWidget } from '../../components/Charts/Charts';
import '../StudentDashboard/StudentDashboard.css';

function StatCard({ icon, label, value }) {
  return (
    <div className="card stat-card">
      <span className="stat-card__icon">{icon}</span>
      <div><div className="stat-card__value">{value}</div><div className="stat-card__label">{label}</div></div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [categories, setCategories] = useState({ labels: [], data: [] });

  useEffect(() => {
    async function load() {
      const [{ count: students }, { count: companies }, { count: internships }, { count: totalApps }, { count: pending }, { count: accepted }, { data: apps }, { data: internshipRows }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('internships').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('applications').select('applied_at'),
        supabase.from('internships').select('category'),
      ]);
      setStats({ students, companies, internships, totalApps, pending, accepted });
      setApplications(apps || []);

      const counts = {};
      (internshipRows || []).forEach((r) => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
      setCategories({ labels: Object.keys(counts), data: Object.values(counts) });
    }
    load().catch(() => {});
  }, []);

  const now = new Date();
  const labels = []; const monthCounts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short' }));
    monthCounts.push(applications.filter((a) => {
      const ad = new Date(a.applied_at);
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
    }).length);
  }

  return (
    <div className="student-dashboard">
      <h1>Admin overview</h1>
      <p className="student-dashboard__subtitle">Platform-wide activity at a glance.</p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon={<HiOutlineUsers />} label="Total students" value={stats?.students ?? '—'} />
        <StatCard icon={<HiOutlineOfficeBuilding />} label="Total companies" value={stats?.companies ?? '—'} />
        <StatCard icon={<HiOutlineBriefcase />} label="Total internships" value={stats?.internships ?? '—'} />
        <StatCard icon={<HiOutlineClipboardList />} label="Total applications" value={stats?.totalApps ?? '—'} />
        <StatCard icon={<HiOutlineClock />} label="Pending reviews" value={stats?.pending ?? '—'} />
        <StatCard icon={<HiOutlineCheckCircle />} label="Accepted students" value={stats?.accepted ?? '—'} />
      </div>

      <div className="chart-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card chart-card">
          <h3>Applications per month</h3>
          <ApplicationsByMonthChart labels={labels} data={monthCounts} />
        </div>
        <div className="card chart-card">
          <h3>Internship categories</h3>
          <BarChartWidget labels={categories.labels} data={categories.data} label="Internships" />
        </div>
      </div>
    </div>
  );
}
