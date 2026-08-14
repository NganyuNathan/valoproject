export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isStrongPassword = (password) => (password || '').length >= 8;

export function validateRegistrationStep(step, values) {
  const errors = {};
  if (step === 'account') {
    if (!values.first_name) errors.first_name = 'First name is required';
    if (!values.last_name) errors.last_name = 'Last name is required';
    if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address';
    if (!isStrongPassword(values.password)) errors.password = 'At least 8 characters';
    if (values.password !== values.confirm_password) errors.confirm_password = 'Passwords do not match';
  }
  if (step === 'education') {
    const label = values.education_level === 'secondary_school' ? 'School name' : 'University';
    if (!values.university) errors.university = `${label} is required`;
    if (values.education_level !== 'secondary_school' && !values.degree) errors.degree = 'Degree is required';
  }
  return errors;
}
