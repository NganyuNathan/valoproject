import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineDocumentText, HiOutlineMail, HiOutlineCheck, HiOutlineX, HiOutlineTrash } from 'react-icons/hi';
import { listAllApplications, updateApplicationStatus, updatePaymentStatus, deleteApplication, applicationsToCSV } from '../../services/applicationService';
import { syncPayments } from '../../services/paymentService';
import { getSignedUrl, BUCKETS } from '../../services/supabase';
import { formatDate } from '../../utils/formatters';
import './AdminTables.css';
import { friendlyError } from '../../utils/errors';

const STATUSES = ['paid', 'pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];

const PAYMENT_LABELS = { unpaid: 'Unpaid', reported: 'Reported — needs check', verified: 'Paid', rejected: 'Rejected' };

function PaymentBadge({ status }) {
  return <span className={`payment-badge payment-badge--${status}`}>{PAYMENT_LABELS[status] || status}</span>;
}

// An application is "complete" once the student has finished uploading (a resume at minimum).
const isComplete = (a) => Boolean(a.resume_url);

// Admins may open documents only when the payment is confirmed AND the application is complete.
const canAccessDocs = (a) => a.payment_status === 'verified' && a.status !== 'unpaid' && isComplete(a);

const lockReason = (a) => {
  if (a.payment_status !== 'verified' || a.status === 'unpaid') return 'Locked until payment is confirmed';
  if (!isComplete(a)) return 'Locked until the student finishes uploading their documents';
  return null;
};

const fileExt = (path = '') => (path.match(/\.[A-Za-z0-9]{2,5}$/) || [''])[0];

/** Every uploaded file of an application, with the bucket it lives in and a friendly download name. */
function collectFiles(a) {
  const who = `${a.profiles?.first_name || ''}-${a.profiles?.last_name || ''}`.replace(/[^\w-]+/g, '') || 'student';
  const files = [];
  if (a.resume_url) files.push({ kind: 'resume', bucket: BUCKETS.RESUMES, path: a.resume_url, label: 'resume', filename: `${who}-resume${fileExt(a.resume_url)}` });
  if (a.cover_letter_url) files.push({ kind: 'cover', bucket: BUCKETS.COVER_LETTERS, path: a.cover_letter_url, label: 'cover letter', filename: `${who}-cover-letter${fileExt(a.cover_letter_url)}` });
  (Array.isArray(a.documents) ? a.documents : []).forEach((d) => {
    if (d?.path) files.push({ kind: 'extra', bucket: BUCKETS.RESUMES, path: d.path, label: d.name || 'document', filename: d.name || `${who}-document${fileExt(d.path)}` });
  });
  return files;
}

const triggerDownload = (url) => {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default function ApplicationsManagement() {
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Always read the latest search text, even when load() was created before the person typed it.
  const searchRef = useRef(search);
  searchRef.current = search;

  // `sync` first asks the server to re-check payments that were never confirmed (so a student
  // who paid but closed the page still flips to Paid); `silent` refreshes without the skeleton.
  const load = useCallback(({ sync = false, silent = false } = {}) => {
    if (!silent) setLoading(true);
    const prepare = sync ? syncPayments() : Promise.resolve();
    return prepare
      .then(() => listAllApplications({ status: statusFilter, search: searchRef.current }))
      .then(setApplications)
      .catch((err) => { if (!silent) toast.error(friendlyError(err)); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { load({ sync: true }); }, [load]);

  // Pick up payments the webhook confirmed while this page is open.
  useEffect(() => {
    const timer = setInterval(() => load({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const handleStatusChange = async (id, status) => {
    try { await updateApplicationStatus(id, status); toast.success('Status updated'); load({ silent: true }); } catch (err) { toast.error(friendlyError(err)); }
  };

  const handlePaymentVerify = async (id, paymentStatus) => {
    try { await updatePaymentStatus(id, paymentStatus); toast.success('Payment status updated'); load({ silent: true }); } catch (err) { toast.error(friendlyError(err)); }
  };

  const handleDelete = async (a) => {
    const who = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim() || 'this student';
    const what = a.internships?.title || 'this internship';
    if (!window.confirm(`Permanently delete ${who}'s application for "${what}"?\n\nThis can't be undone. Any payment they made is not refunded.`)) return;
    try {
      await deleteApplication(a.id);
      setApplications((prev) => prev.filter((x) => x.id !== a.id));
      toast.success('Application deleted');
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const guardAccess = (application) => {
    const reason = lockReason(application);
    if (reason) toast.error(reason);
    return !reason;
  };

  const handleViewDocument = async (application, file) => {
    if (!guardAccess(application)) return;
    if (!file) { toast.error('No file on record for this application'); return; }
    try {
      window.open(await getSignedUrl(file.bucket, file.path, 120), '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(friendlyError(err, `Could not open ${file.label}`));
    }
  };

  const handleDownloadDocument = async (application, file) => {
    if (!guardAccess(application)) return;
    try {
      triggerDownload(await getSignedUrl(file.bucket, file.path, 120, { download: file.filename }));
    } catch (err) {
      toast.error(friendlyError(err, `Could not download ${file.label}`));
    }
  };

  const handleDownloadAll = async (application) => {
    if (!guardAccess(application)) return;
    const files = collectFiles(application);
    if (files.length === 0) { toast.error('No documents on record for this application'); return; }
    try {
      for (const file of files) {
        triggerDownload(await getSignedUrl(file.bucket, file.path, 120, { download: file.filename }));
        await new Promise((r) => setTimeout(r, 400)); // browsers drop downloads fired in the same instant
      }
      toast.success(`Downloading ${files.length} file${files.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(friendlyError(err, 'Could not download all documents'));
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => load({ sync: true })}>Check payments</button>
          <button className="btn btn-outline" onClick={exportCSV}><HiOutlineDownload /> Export CSV</button>
        </div>
      </div>

      <div className="admin-toolbar">
        <input className="input" placeholder="Search student or internship" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input" style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => load()}>Search</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="card admin-table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Internship</th><th>Applied</th><th>Documents</th><th>Payment</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.profiles?.first_name} {a.profiles?.last_name}<br /><span style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>{a.profiles?.email}</span></td>
                  <td>{a.internships?.title}<br /><span style={{ color: 'var(--color-text-faint)', fontSize: '0.78rem' }}>{a.internships?.companies?.name}</span></td>
                  <td>{formatDate(a.applied_at)}</td>
                  <td className="admin-table__actions">
                    {(() => {
                      const open = canAccessDocs(a);
                      const files = collectFiles(a);
                      const resume = files.find((f) => f.kind === 'resume');
                      const cover = files.find((f) => f.kind === 'cover');
                      const extras = files.filter((f) => f.kind === 'extra');
                      const reason = lockReason(a);
                      return (
                        <>
                          <button onClick={() => handleViewDocument(a, resume)} aria-label="View resume" title={reason || (resume ? 'View resume' : 'No resume on file')} disabled={!open || !resume}>
                            <HiOutlineDocumentText />
                          </button>
                          <button onClick={() => handleViewDocument(a, cover)} aria-label="View cover letter" title={reason || (cover ? 'View cover letter' : 'No cover letter (optional)')} disabled={!open || !cover}>
                            <HiOutlineMail />
                          </button>
                          <button onClick={() => handleDownloadAll(a)} aria-label="Download all documents" title={reason || 'Download all documents'} disabled={!open || files.length === 0}>
                            <HiOutlineDownload />
                          </button>
                          {reason && (
                            <div style={{ flexBasis: '100%', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>
                              {isComplete(a) ? 'Awaiting payment' : a.payment_status === 'verified' ? 'Incomplete — no documents yet' : 'Awaiting payment'}
                            </div>
                          )}
                          {open && extras.length > 0 && (
                            <div style={{ flexBasis: '100%', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                              {extras.map((f) => (
                                <span key={f.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button type="button" onClick={() => handleViewDocument(a, f)} title={`Open ${f.label}`}
                                    style={{ all: 'unset', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.label}
                                  </button>
                                  <button type="button" onClick={() => handleDownloadDocument(a, f)} title={`Download ${f.label}`} aria-label={`Download ${f.label}`}
                                    style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}>
                                    <HiOutlineDownload />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <PaymentBadge status={a.payment_status || 'unpaid'} />
                    {a.payment_reference && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
                        {({ mtn: 'MTN', orange: 'Orange', fapshi: 'Fapshi' })[a.payment_method] || 'Payment'} ref: {a.payment_reference}
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
                  <td className="admin-table__actions">
                    <button onClick={() => handleDelete(a)} aria-label="Delete application" title="Delete application"><HiOutlineTrash /></button>
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
