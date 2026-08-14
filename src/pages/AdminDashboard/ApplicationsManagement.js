import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineDocumentText, HiOutlineMail, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { listAllApplications, updateApplicationStatus, updatePaymentStatus, applicationsToCSV } from '../../services/applicationService';
import { getSignedUrl, BUCKETS } from '../../services/supabase';
import { formatDate } from '../../utils/formatters';
import './AdminTables.css';

const STATUSES = ['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];

const PAYMENT_LABELS = { unpaid: 'Unpaid', reported: 'Reported — needs check', verified: 'Verified', rejected: 'Rejected' };

function PaymentBadge({ status }) {
  return <span className={`payment-badge payment-badge--${status}`}>{PAYMENT_LABELS[status] || status}</span>;
}

export default function ApplicationsManagement() {
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listAllApplications({ status: statusFilter, search }).then(setApplications).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);
  useEffect(load, [load]);

  const handleStatusChange = async (id, status) => {
    try { await updateApplicationStatus(id, status); toast.success('Status updated'); load(); } catch (err) { toast.error(err.message); }
  };

  const handlePaymentVerify = async (id, paymentStatus) => {
    try { await updatePaymentStatus(id, paymentStatus); toast.success('Payment status updated'); load(); } catch (err) { toast.error(err.message); }
  };

  const handleViewDocument = async (bucket, pathOrUrl, label) => {
    if (!pathOrUrl) {
      toast.error(`No ${label} on file for this application`);
      return;
    }
    try {
      const signedUrl = await getSignedUrl(bucket, pathOrUrl, 120);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.message || `Could not open ${label}`);
    }
  };

  const exportCSV = () => {
    const csv = applicationsToCSV(applications);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Applications</h1>
        <button className="btn btn-outline" onClick={exportCSV}><HiOutlineDownload /> Export CSV</button>
      </div>

      <div className="admin-toolbar">
        <input className="input" placeholder="Search student or internship" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input" style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}>Search</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="card admin-table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Internship</th><th>Applied</th><th>Documents</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.profiles?.first_name} {a.profiles?.last_name}<br /><span style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>{a.profiles?.email}</span></td>
                  <td>{a.internships?.title}<br /><span style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>{a.internships?.companies?.name}</span></td>
                  <td>{formatDate(a.applied_at)}</td>
                  <td className="admin-table__actions">
                    <button
                      onClick={() => handleViewDocument(BUCKETS.RESUMES, a.resume_url, 'resume')}
                      aria-label="View resume"
                      title="View resume"
                      disabled={!a.resume_url}
                    >
                      <HiOutlineDocumentText />
                    </button>
                    <button
                      onClick={() => handleViewDocument(BUCKETS.COVER_LETTERS, a.cover_letter_url, 'cover letter')}
                      aria-label="View cover letter"
                      title="View cover letter"
                      disabled={!a.cover_letter_url}
                    >
                      <HiOutlineMail />
                    </button>
                  </td>
                  <td>
                    <PaymentBadge status={a.payment_status || 'unpaid'} />
                    {a.payment_reference && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
                        {a.payment_method === 'mtn' ? 'MTN' : 'Orange'} ref: {a.payment_reference}
                      </div>
                    )}
                    {a.payment_status === 'reported' && (
                      <div className="admin-table__actions" style={{ marginTop: 6 }}>
                        <button onClick={() => handlePaymentVerify(a.id, 'verified')} aria-label="Mark payment verified" title="Verified">
                          <HiOutlineCheck />
                        </button>
                        <button onClick={() => handlePaymentVerify(a.id, 'rejected')} aria-label="Mark payment rejected" title="Reject">
                          <HiOutlineX />
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <select className="input" style={{ padding: '6px 10px' }} value={a.status} onChange={(e) => handleStatusChange(a.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
