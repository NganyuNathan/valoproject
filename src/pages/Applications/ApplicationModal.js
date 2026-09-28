import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineX, HiOutlineUpload } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { createOrGetDraftApplication, updateApplicationDetails } from '../../services/applicationService';
import { uploadPrivateFile, BUCKETS } from '../../services/supabase';
import PaymentStep from './PaymentStep';
import './Applications.css';

export default function ApplicationModal({ internship, onClose }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState('loading'); // 'loading' | 'payment' | 'form'
  const [applicationId, setApplicationId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create (or resume) the application row as soon as the modal opens, so
  // Fapshi has a real application id to attach the payment to.
  useEffect(() => {
    let cancelled = false;
    createOrGetDraftApplication({ studentId: user.id, internshipId: internship.id })
      .then((app) => {
        if (cancelled) return;
        setApplicationId(app.id);
        setStep(app.payment_status === 'verified' ? 'form' : 'payment');
      })
      .catch((err) => {
        toast.error(err.message || 'Could not start your application');
        onClose();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internship.id, user.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile && !profile?.resume_url) {
      toast.error('Please attach a resume');
      return;
    }
    setSubmitting(true);
    try {
      let resumeUrl = profile?.resume_url;
      let coverLetterUrl = profile?.cover_letter_url || null;

      if (resumeFile) {
        resumeUrl = await uploadPrivateFile(BUCKETS.RESUMES, `${user.id}/${Date.now()}-${resumeFile.name}`, resumeFile);
      }
      if (coverLetterFile) {
        coverLetterUrl = await uploadPrivateFile(BUCKETS.COVER_LETTERS, `${user.id}/${Date.now()}-${coverLetterFile.name}`, coverLetterFile);
      }

      await updateApplicationDetails(applicationId, {
        resumeUrl, coverLetterUrl, motivationLetter: motivation,
      });

      toast.success('Application submitted!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          className="modal card"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal__header">
            <h2>Apply — {internship.title}</h2>
            <button className="modal__close" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
          </div>

          {step === 'loading' && (
            <div className="modal__body"><div className="skeleton" style={{ height: 120 }} /></div>
          )}

          {step === 'payment' && (
            <div className="modal__body">
              <PaymentStep
                applicationId={applicationId}
                userId={user.id}
                email={user.email}
                onConfirmed={() => setStep('form')}
              />
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="modal__body">
              <div className="payment-step__paid-badge">Payment confirmed</div>
              <div className="field">
                <label>Resume (PDF)</label>
                <label className="file-input">
                  <HiOutlineUpload />
                  {resumeFile ? resumeFile.name : profile?.resume_url ? 'Using resume from your profile' : 'Choose file'}
                  <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files[0])} className="visually-hidden" />
                </label>
              </div>
              <div className="field">
                <label>Cover letter (optional)</label>
                <label className="file-input">
                  <HiOutlineUpload />
                  {coverLetterFile ? coverLetterFile.name : 'Choose file'}
                  <input type="file" accept="application/pdf" onChange={(e) => setCoverLetterFile(e.target.files[0])} className="visually-hidden" />
                </label>
              </div>
              <div className="field">
                <label>Short motivation letter</label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Tell the team why you're a great fit..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
