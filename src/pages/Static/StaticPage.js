import React from 'react';
import './StaticPage.css';

export default function StaticPage({ title, children }) {
  return (
    <div className="container static-page">
      <h1>{title}</h1>
      <div className="static-page__body">{children}</div>
    </div>
  );
}
