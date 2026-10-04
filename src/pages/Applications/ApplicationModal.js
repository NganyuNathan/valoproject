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
  const [step, setStep] = useState('loading'); // 'loading' | 'form' | 'payment' | 'finishing'
  const [applicationId, setApplicationId] = useState(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false); // handles reopening a draft that was already paid for
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [motivation, setMotivation] = useState('');
  const [formError, setFormError] = useState(null);

  // Create (or resume) the application row as soon as the modal opens, so
  // there's a real application id for Fapshi to attach the payment to.
  // Nothing about the student's documents gets written yet — just the bare
  // row (status: pending, payment: unpaid).
  useEffect(() => {
    let cancelled = false;
    createOrGetDraftApplication({ studentId: user.id, internshipId: internship.id })
      .then((app) => {
        if (cancelled) return;
        setApplicationId(app.id);
        setAlreadyPaid(app.payment_status === 'verified');
        setStep('form');
      })
      .catch((err) => {
        toast.error(err.message || 'Could not start your application');
        onClose();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internship.id, user.id]);

  /**
   * Actually uploads the resume/cover letter and saves them, along with the
   * motivation letter, to the application row. Only ever called once payment
   * has been confirmed (or was already confirmed in an earlier session) —
   * nothing is written to storage or the database before that.
   */
  const persistDocuments = async () => {
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
  };

  // Step 1: just validate and hold onto the documents in memory — nothing is
  // uploaded yet. If payment was already done in an earlier session, there's
  // nothing left to pay for, so persist immediately instead.
  const handleDocumentsSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile && !profile?.resume_url) {
      setFormError('Please attach a resume');
      return;
    }
    setFormError(null);

    if (alreadyPaid) {
      setStep('finishing');
      try {
        await persistDocuments();
        toast.success('Application submitted!');
        onClose();
      } catch (err) {
        toast.error(err.message || 'Could not submit application');
        setStep('form');
      }
      return;
    }

    setStep('payment');
  };

  // Step 2: payment confirmed by Fapshi — only now do we actually upload the
  // documents and write them to the application row.
  const handlePaymentConfirmed = async () => {
    setStep('finishing');
    try {
      await persistDocuments();
      toast.success('Payment confirmed — your application has been submitted!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Payment went through, but we could not save your documents — please try again.');
      setStep('form');
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

          {step === 'form' && (
            <form onSubmit={handleDocumentsSubmit} className="modal__body">
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
              {formError && <div className="field-error" style={{ marginBottom: 8 }}>{formError}</div>}
              {!alreadyPaid && (
                <p className="field-hint" style={{ marginBottom: 8 }}>
                  Your documents are only uploaded after payment is confirmed — nothing is saved yet.
                </p>
              )}
              <button className="btn btn-primary btn-block">
                {alreadyPaid ? 'Submit application' : 'Continue to payment'}
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="modal__body">
              <PaymentStep
                applicationId={applicationId}
                userId={user.id}
                email={user.email}
                onConfirmed={handlePaymentConfirmed}
              />
            </div>
          )}

          {step === 'finishing' && (
            <div className="modal__body payment-step__status" style={{ justifyContent: 'center' }}>
              <span className="payment-step__spinner" />
              Uploading your documents…
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
