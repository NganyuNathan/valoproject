import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listMyApplications } from '../../services/applicationService';
import { syncPayments } from '../../services/paymentService';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ApplicationModal from './ApplicationModal';
import './MyApplications.css';

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continueTarget, setContinueTarget] = useState(null);

  const load = useCallback(() => listMyApplications(user.id).then(setApplications), [user]);

  // Re-check any payment that was started but never confirmed (e.g. the page was closed
  // right after paying), then show the up-to-date list.
  useEffect(() => {
    if (!user) return;
    syncPayments().then(load).finally(() => setLoading(false));
  }, [user, load]);

  // Needs the student's attention: payment not confirmed yet, or paid but documents never uploaded.
  const needsAction = (a) => a.status === 'unpaid' || (a.payment_status === 'verified' && !a.resume_url);

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
              <tr><th>Internship</th><th>Company</th><th>Applied</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.internships?.title}</td>
                  <td>{a.internships?.companies?.name}</td>
                  <td>{formatDate(a.applied_at)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {needsAction(a) && a.internships && (
                      <button className="btn btn-outline btn-sm" onClick={() => setContinueTarget(a.internships)}>
                        {a.payment_status === 'verified' ? 'Upload documents' : 'Continue'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {continueTarget && (
        <ApplicationModal
          internship={continueTarget}
          onClose={() => { setContinueTarget(null); load(); }}
        />
      )}
    </div>
  );
}
