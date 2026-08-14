import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineTrash } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { listSavedInternships, unsaveInternship } from '../../services/internshipService';
import InternshipCard from '../../components/InternshipCard/InternshipCard';

export default function SavedInternships() {
  const { user } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    listSavedInternships(user.id).then(setSaved).finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  // An internship that was later archived/deleted by an admin still leaves a
  // row here, but the joined `internships` record comes back null (RLS hides
  // anything that isn't published). Split those out instead of crashing.
  const validSaves = saved.filter((s) => s.internships);
  const orphanedSaves = saved.filter((s) => !s.internships);

  const handleRemove = async (internshipId, savedRowId) => {
    try {
      if (internshipId) {
        await unsaveInternship(user.id, internshipId);
      } else {
        // Orphaned row has no internship to match on — remove by the saved_internships row's own id instead.
        await unsaveInternship(user.id, null, savedRowId);
      }
      setSaved((prev) => prev.filter((s) => s.id !== savedRowId));
      toast.success('Removed from saved');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 20 }}>Saved internships</h1>

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : saved.length === 0 ? (
        <div className="card empty-state"><h3>Nothing saved yet</h3><p>Bookmark internships while browsing to find them here later.</p></div>
      ) : (
        <>
          {validSaves.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {validSaves.map((s) => (
                <InternshipCard
                  key={s.id}
                  internship={s.internships}
                  saved
                  onSave={() => handleRemove(s.internships.id, s.id)}
                  showApply={false}
                />
              ))}
            </div>
          )}

          {orphanedSaves.length > 0 && (
            <div className="card" style={{ marginTop: validSaves.length ? 20 : 0, padding: 18 }}>
              <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                {orphanedSaves.length} saved internship{orphanedSaves.length > 1 ? 's are' : ' is'} no longer available (closed or removed by the company).
              </p>
              {orphanedSaves.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-line-soft)' }}>
                  <span style={{ color: 'var(--color-text-faint)', fontSize: '0.85rem' }}>Internship no longer available</span>
                  <button
                    onClick={() => handleRemove(null, s.id)}
                    aria-label="Remove"
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
                  >
                    <HiOutlineTrash /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}