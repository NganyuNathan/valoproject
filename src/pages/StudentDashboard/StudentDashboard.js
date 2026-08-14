import React, { useEffect, useState } from 'react';
import { HiOutlineBriefcase, HiOutlineBookmark, HiOutlineClipboardList, HiOutlineCalendar } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { listMyApplications } from '../../services/applicationService';
import { listSavedInternships } from '../../services/internshipService';
import { listInternships } from '../../services/internshipService';
import { ApplicationsByMonthChart, ApplicationStatusChart } from '../../components/Charts/Charts';
import './StudentDashboard.css';

function StatCard({ icon, label, value }) {
  return (
    <div className="card stat-card">
      <span className="stat-card__icon">{icon}</span>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

function monthlyBuckets(applications) {
  const now = new Date();
  const labels = [];
  const counts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short' }));
    counts.push(applications.filter((a) => {
      const ad = new Date(a.applied_at);
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
    }).length);
  }
  return { labels, counts };
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      listMyApplications(profile.id),
      listSavedInternships(profile.id),
      listInternships({ page: 1, pageSize: 1 }),
    ]).then(([apps, saved, { count }]) => {
      setApplications(apps || []);
      setSavedCount(saved?.length || 0);
      setAvailableCount(count || 0);
    }).finally(() => setLoading(false));
  }, [profile]);

  const interviews = applications.filter((a) => a.status === 'interview_scheduled').length;
  const { labels, counts } = monthlyBuckets(applications);

  const statusCounts = ['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected'].map(
    (s) => applications.filter((a) => a.status === s).length
  );

  return (
    <div className="student-dashboard">
      <h1>Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}</h1>
      <p className="student-dashboard__subtitle">Here's where your internship search stands today.</p>

      <div className="stat-grid">
        <StatCard icon={<HiOutlineBriefcase />} label="Available internships" value={loading ? '—' : availableCount} />
        <StatCard icon={<HiOutlineBookmark />} label="Saved opportunities" value={loading ? '—' : savedCount} />
        <StatCard icon={<HiOutlineClipboardList />} label="Applications submitted" value={loading ? '—' : applications.length} />
        <StatCard icon={<HiOutlineCalendar />} label="Interviews scheduled" value={loading ? '—' : interviews} />
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Applications by month</h3>
          <ApplicationsByMonthChart labels={labels} data={counts} />
        </div>
        <div className="card chart-card">
          <h3>Application status</h3>
          <ApplicationStatusChart labels={['Pending', 'Under Review', 'Interview', 'Accepted', 'Rejected']} data={statusCounts} />
        </div>
      </div>
    </div>
  );
}
