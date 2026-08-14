import React, { createContext, useContext, useState, useCallback } from 'react';
import { listInternships } from '../services/internshipService';

const InternshipContext = createContext(null);

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  industry: '',
  location: '',
  workMode: '',
  paid: '',
  duration: '',
  page: 1,
};

export function InternshipProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [internships, setInternships] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInternships = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    const merged = { ...filters, ...overrides };
    try {
      const { data, count } = await listInternships(merged);
      setInternships(data || []);
      setTotal(count || 0);
      setFilters(merged);
    } catch (err) {
      setError(err.message || 'Failed to load internships');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const value = { filters, internships, total, loading, error, fetchInternships, updateFilters, resetFilters };
  return <InternshipContext.Provider value={value}>{children}</InternshipContext.Provider>;
}

export function useInternships() {
  const ctx = useContext(InternshipContext);
  if (!ctx) throw new Error('useInternships must be used within an InternshipProvider');
  return ctx;
}
