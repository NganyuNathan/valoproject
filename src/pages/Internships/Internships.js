import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchBar from '../../components/SearchBar/SearchBar';
import Filters from '../../components/Filters/Filters';
import InternshipCard from '../../components/InternshipCard/InternshipCard';
import ApplicationModal from '../Applications/ApplicationModal';
import { useInternships } from '../../context/InternshipContext';
import { useAuth } from '../../context/AuthContext';
import { saveInternship, unsaveInternship } from '../../services/internshipService';
import './Internships.css';

export default function Internships() {
  const [searchParams] = useSearchParams();
  const { filters, internships, total, loading, fetchInternships, updateFilters, resetFilters } = useInternships();
  const { isAuthenticated, user } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());
  const [applyTarget, setApplyTarget] = useState(null);

  useEffect(() => {
    const initial = {};
    if (searchParams.get('search')) initial.search = searchParams.get('search');
    if (searchParams.get('category')) initial.category = searchParams.get('category');
    fetchInternships(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async (internship) => {
    if (!isAuthenticated) {
      toast.error('Sign in to save internships');
      return;
    }
    const isSaved = savedIds.has(internship.id);
    try {
      if (isSaved) {
        await unsaveInternship(user.id, internship.id);
        setSavedIds((prev) => { const next = new Set(prev); next.delete(internship.id); return next; });
        toast.success('Removed from saved');
      } else {
        await saveInternship(user.id, internship.id);
        setSavedIds((prev) => new Set(prev).add(internship.id));
        toast.success('Saved internship');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  }, [isAuthenticated, savedIds, user]);

  const handleApply = (internship) => {
    if (!isAuthenticated) {
      toast.error('Sign in to apply');
      return;
    }
    setApplyTarget(internship);
  };

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="container internships-page">
      <div className="internships-page__header">
        <h1>Browse internships</h1>
        <p>{total} opportunit{total === 1 ? 'y' : 'ies'} open to applications.</p>
      </div>

      <SearchBar defaultValue={filters.search} onSearch={(q) => fetchInternships({ search: q, page: 1 })} />

      <div className="internships-page__body">
        <Filters
          filters={filters}
          onChange={(patch) => { updateFilters(patch); fetchInternships(patch); }}
          onReset={() => { resetFilters(); fetchInternships({ search: '', category: '', industry: '', location: '', workMode: '', paid: '', duration: '', page: 1 }); }}
        />

        <div className="internships-page__results">
          {loading ? (
            <div className="internships-page__grid">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
            </div>
          ) : internships.length ? (
            <>
              <div className="internships-page__grid">
                {internships.map((i) => (
                  <InternshipCard
                    key={i.id}
                    internship={i}
                    saved={savedIds.has(i.id)}
                    onSave={handleSave}
                    onApply={handleApply}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`pagination__btn ${filters.page === i + 1 ? 'active' : ''}`}
                      onClick={() => fetchInternships({ page: i + 1 })}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state card">
              <h3>No internships match yet</h3>
              <p>Try widening your filters or searching a different skill or city.</p>
            </div>
          )}
        </div>
      </div>

      {applyTarget && (
        <ApplicationModal internship={applyTarget} onClose={() => setApplyTarget(null)} />
      )}
    </div>
  );
}
