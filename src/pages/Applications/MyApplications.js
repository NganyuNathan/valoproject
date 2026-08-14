import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listMyApplications } from '../../services/applicationService';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import './MyApplications.css';

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listMyApplications(user.id).then(setApplications).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="my-applications">
      <h1>My applications</h1>
      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : applications.length === 0 ? (
        <div className="card empty-state"><h3>No applications yet</h3><p>Browse internships and apply to start tracking them here.</p></div>
      ) : (
        <div className="card my-applications__table-wrap">
          <table className="table">
            <thead>
              <tr><th>Internship</th><th>Company</th><th>Applied</th><th>Status</th></tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.internships?.title}</td>
                  <td>{a.internships?.companies?.name}</td>
                  <td>{formatDate(a.applied_at)}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
