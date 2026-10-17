import { supabase } from './supabase';

/**
 * Register a new student account.
 *
 * Email confirmation is required, so the student is NOT logged in after this call —
 * they have to click the link we email them first. That means we can't write to the
 * database or upload files here. Instead the profile details travel as sign-up
 * metadata, and the `handle_new_user` database trigger copies them into `profiles`.
 */
export async function registerStudent({ email, password, profile }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: { ...profile, full_name: `${profile.first_name} ${profile.last_name}`.trim() },
    },
  });
  if (error) throw error;

  // For an email that's already registered, Supabase pretends it worked (so strangers
  // can't discover who has an account) but returns a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }
  return data; // data.session is null until the email is confirmed
}

/** Sends the confirmation email again (e.g. it went to spam or expired). */
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Fetch the profiles row (includes role) for a given auth user id. */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
