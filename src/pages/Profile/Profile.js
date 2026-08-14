import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineUpload } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/authService';
import { uploadFile, uploadPrivateFile, BUCKETS } from '../../services/supabase';
import { initials } from '../../utils/formatters';
import '../Register/Auth.css';
import './Profile.css';

const SKILLS = ['Java', 'Python', 'JavaScript', 'React', 'SQL', 'C++', 'PHP', 'Networking', 'AI', 'Machine Learning', 'UI/UX', 'Node.js'];

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState(profile || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleSkill = (skill) => {
    const current = (form.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
    setForm((f) => ({ ...f, skills: next.join(',') }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFile(BUCKETS.AVATARS, `${user.id}/photo-${Date.now()}`, file);
      setForm((f) => ({ ...f, profile_photo: url }));
      toast.success('Photo uploaded — remember to save changes');
    } catch (err) { toast.error(err.message); }
  };

  const handleResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const path = await uploadPrivateFile(BUCKETS.RESUMES, `${user.id}/resume-${Date.now()}`, file);
      setForm((f) => ({ ...f, resume_url: path }));
      toast.success('Resume uploaded — remember to save changes');
    } catch (err) { toast.error(err.message); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(user.id, form);
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const skillList = (form.skills || '').split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="profile-page">
      <h1>My profile</h1>
      <form onSubmit={handleSave}>
        <div className="card profile-section">
          <h3>Photo</h3>
          <div className="profile-photo-row">
            <div className="profile-photo-preview">
              {form.profile_photo ? <img src={form.profile_photo} alt="" /> : initials(`${form.first_name || ''} ${form.last_name || ''}`)}
            </div>
            <label className="file-input"><HiOutlineUpload /> Change photo<input type="file" accept="image/*" className="visually-hidden" onChange={handlePhoto} /></label>
          </div>
        </div>

        <div className="card profile-section">
          <h3>Personal information</h3>
          <div className="grid-2">
            <div className="field"><label>First name</label><input className="input" value={form.first_name || ''} onChange={set('first_name')} /></div>
            <div className="field"><label>Last name</label><input className="input" value={form.last_name || ''} onChange={set('last_name')} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Phone</label><input className="input" value={form.phone || ''} onChange={set('phone')} /></div>
            <div className="field"><label>Date of birth</label><input className="input" type="date" value={form.date_of_birth || ''} onChange={set('date_of_birth')} /></div>
          </div>
        </div>

        <div className="card profile-section">
          <h3>Academic information</h3>
          <div className="grid-2">
            <div className="field"><label>University</label><input className="input" value={form.university || ''} onChange={set('university')} /></div>
            <div className="field"><label>Degree</label><input className="input" value={form.degree || ''} onChange={set('degree')} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Field of study</label><input className="input" value={form.field_of_study || ''} onChange={set('field_of_study')} /></div>
            <div className="field"><label>CGPA</label><input className="input" value={form.cgpa || ''} onChange={set('cgpa')} /></div>
          </div>
        </div>

        <div className="card profile-section">
          <h3>Skills</h3>
          <div className="skills-picker">
            {SKILLS.map((s) => (
              <button type="button" key={s} className={`chip skills-picker__chip ${skillList.includes(s) ? 'active' : ''}`} onClick={() => toggleSkill(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="card profile-section">
          <h3>Resume</h3>
          <label className="file-input"><HiOutlineUpload /> {form.resume_url ? 'Replace resume (PDF)' : 'Upload resume (PDF)'}<input type="file" accept="application/pdf" className="visually-hidden" onChange={handleResume} /></label>
        </div>

        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
