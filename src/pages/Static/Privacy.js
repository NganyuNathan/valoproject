import React from 'react';
import StaticPage from './StaticPage';

export default function Privacy() {
  return (
    <StaticPage title="Privacy policy">
      <p>InternPath stores the information you provide — profile details, resumes, and cover letters — solely to match you with internships and process your applications. Data is protected using Supabase's authentication and row-level security, so students can only access their own records.</p>
      <p>We never sell student data to third parties. Company partners only see application materials for the roles a student has applied to.</p>
    </StaticPage>
  );
}
