import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found container">
      <h1>404</h1>
      <p>We couldn't find that page.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
