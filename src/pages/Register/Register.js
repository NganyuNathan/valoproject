import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap, HiOutlineUpload } from 'react-icons/hi';
import { registerStudent, updateProfile } from '../../services/authService';
import { uploadFile, uploadPrivateFile, BUCKETS } from '../../services/supabase';
import { validateRegistrationStep } from '../../utils/validators';
import './Auth.css';

const SKILLS = ['Java', 'Python', 'JavaScript', 'React', 'SQL', 'C++', 'PHP', 'Networking', 'AI', 'Machine Learning', 'UI/UX', 'Node.js'];
const STEPS = ['account', 'education', 'documents'];

const initialForm = {
  first_name: '', last_name: '', email: '', password: '', confirm_password: '', phone: '',
  education_level: 'university', // 'university' | 'secondary_school'
  university: '',      // university name, or school name for secondary students
  degree: '',           // university only
  field_of_study: '',   // university only
  year_of_study: '',     // year of study (uni) or class/grade (secondary)
  graduation_year: '',   // (expected) graduation year, both
  skills: [],
};

export default function Register() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const isSecondary = form.education_level === 'secondary_school';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleSkill = (skill) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  };

  const goNext = () => {
    const stepErrors = validateRegistrationStep(STEPS[step], form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { password, confirm_password, email, ...profile } = form;
      const result = await registerStudent({
        email,
        password,
        profile: { ...profile, skills: form.skills.join(',') },
      });
      const userId = result.user?.id;
      if (userId) {
        const profileUpdates = {};
        if (photoFile) {
          profileUpdates.profile_photo = await uploadFile(BUCKETS.AVATARS, `${userId}/photo-${Date.now()}`, photoFile);
        }
        if (resumeFile) {
          profileUpdates.resume_url = await uploadPrivateFile(BUCKETS.RESUMES, `${userId}/resume-${Date.now()}`, resumeFile);
        }
        if (Object.keys(profileUpdates).length) {
          await updateProfile(userId, profileUpdates);
        }
      }
      toast.success('Account created! Check your email to confirm.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="card auth-card auth-card--wide" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-card__brand"><HiOutlineAcademicCap /></div>
        <h1>Create your account</h1>
        <p className="auth-card__subtitle">A few quick details so we can match you with the right internships.</p>

        <div className="auth-card__tabs">
          <span className="active">Create account</span>
          <Link to="/login">Sign in</Link>
        </div>

        <div className="register-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`register-steps__dot ${i <= step ? 'done' : ''}`} />
          ))}
        </div>

        <form onSubmit={step === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); goNext(); }}>
          {step === 0 && (
            <fieldset>
              <legend>Account details</legend>
              <div className="grid-2">
                <div className="field"><label>First name</label><input className="input" value={form.first_name} onChange={set('first_name')} />{errors.first_name && <div className="field-error">{errors.first_name}</div>}</div>
                <div className="field"><label>Last name</label><input className="input" value={form.last_name} onChange={set('last_name')} />{errors.last_name && <div className="field-error">{errors.last_name}</div>}</div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />{errors.email && <div className="field-error">{errors.email}</div>}</div>
                <div className="field"><label>Phone number</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="+237 6XX XXX XXX" /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Password</label><input className="input" type="password" value={form.password} onChange={set('password')} /><div className="field-hint">At least 8 characters.</div>{errors.password && <div className="field-error">{errors.password}</div>}</div>
                <div className="field"><label>Confirm password</label><input className="input" type="password" value={form.confirm_password} onChange={set('confirm_password')} />{errors.confirm_password && <div className="field-error">{errors.confirm_password}</div>}</div>
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset>
              <legend>Education</legend>

              <div className="field">
                <label>I am a...</label>
                <div className="education-toggle">
                  <button
                    type="button"
                    className={`education-toggle__option ${!isSecondary ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, education_level: 'university' }))}
                  >
                    University student
                  </button>
                  <button
                    type="button"
                    className={`education-toggle__option ${isSecondary ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, education_level: 'secondary_school' }))}
                  >
                    Secondary school student
                  </button>
                </div>
              </div>

              {isSecondary ? (
                <>
                  <div className="field"><label>School name</label><input className="input" value={form.university} onChange={set('university')} />{errors.university && <div className="field-error">{errors.university}</div>}</div>
                  <div className="grid-2">
                    <div className="field"><label>Class / grade</label><input className="input" value={form.year_of_study} onChange={set('year_of_study')} placeholder="e.g. Form 5, Grade 11" /></div>
                    <div className="field"><label>Expected graduation year</label><input className="input" value={form.graduation_year} onChange={set('graduation_year')} /></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field"><label>University</label><input className="input" value={form.university} onChange={set('university')} />{errors.university && <div className="field-error">{errors.university}</div>}</div>
                  <div className="grid-2">
                    <div className="field"><label>Degree</label>
                      <select className="input" value={form.degree} onChange={set('degree')}>
                        <option value="">Select</option><option>Bachelor's</option><option>Master's</option><option>PhD</option><option>Diploma</option>
                      </select>
                      {errors.degree && <div className="field-error">{errors.degree}</div>}
                    </div>
                    <div className="field"><label>Year of study</label><input className="input" value={form.year_of_study} onChange={set('year_of_study')} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="field"><label>Field of study</label><input className="input" value={form.field_of_study} onChange={set('field_of_study')} /></div>
                    <div className="field"><label>Graduation year</label><input className="input" value={form.graduation_year} onChange={set('graduation_year')} /></div>
                  </div>
                </>
              )}

              <div className="field">
                <label>Skills</label>
                <div className="skills-picker">
                  {SKILLS.map((s) => (
                    <button type="button" key={s} className={`chip skills-picker__chip ${form.skills.includes(s) ? 'active' : ''}`} onClick={() => toggleSkill(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend>Documents</legend>
              <div className="field">
                <label>Profile photo (optional)</label>
                <label className="file-input"><HiOutlineUpload />{photoFile ? photoFile.name : 'Choose an image'}<input type="file" accept="image/*" className="visually-hidden" onChange={(e) => setPhotoFile(e.target.files[0])} /></label>
              </div>
              <div className="field">
                <label>Resume (optional{isSecondary ? ' — most secondary students don\'t have one yet' : ''})</label>
                <label className="file-input"><HiOutlineUpload />{resumeFile ? resumeFile.name : 'Choose a PDF'}<input type="file" accept="application/pdf" className="visually-hidden" onChange={(e) => setResumeFile(e.target.files[0])} /></label>
              </div>
            </fieldset>
          )}

          <div className="register-nav">
            {step > 0 && <button type="button" className="btn btn-outline" onClick={goBack}>Back</button>}
            {step < STEPS.length - 1
              ? <button type="submit" className="btn btn-primary">Continue</button>
              : <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>}
          </div>
        </form>

        <p className="auth-card__footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </motion.div>
    </div>
  );
}
