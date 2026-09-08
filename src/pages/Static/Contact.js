import React from 'react';
import { HiOutlineMail } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import StaticPage from './StaticPage';
import './Contact.css';

// Edit these two values with your real contact details.
const CONTACT = {
  whatsappNumber: '+237 654 101 614', // display format
  whatsappLink: 'https://wa.me/654101614', // digits only, no + or spaces, country code first
  email: 'valointern237@gmail.com',
};

export default function Contact() {
  return (
    <StaticPage title="Contact us">
      <p>Have a question or need help with your account? Reach us directly:</p>
      <div className="contact-cards">
        <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer" className="card contact-card">
          <span className="contact-card__icon contact-card__icon--whatsapp"><FaWhatsapp /></span>
          <div>
            <div className="contact-card__label">WhatsApp</div>
            <div className="contact-card__value">{CONTACT.whatsappNumber}</div>
          </div>
        </a>
        <a href={`mailto:${CONTACT.email}`} className="card contact-card">
          <span className="contact-card__icon contact-card__icon--email"><HiOutlineMail /></span>
          <div>
            <div className="contact-card__label">Email</div>
            <div className="contact-card__value">{CONTACT.email}</div>
          </div>
        </a>
      </div>
    </StaticPage>
  );
}
