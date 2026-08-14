import React from 'react';
import './StatusBadge.css';

const LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  interview_scheduled: 'Interview Scheduled',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status] || status}</span>;
}
