import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { listInternships } from '../services/internshipService';

const InternshipContext = createContext(null);

export const DEFAULT_FILTERS = {
  search: '',
  category: '',
  industry: '',
  location: '',
  workMode: '',
  paid: '',
  duration: '',
  company: '',
  skills: '',
  minSalary: '',
  closingWithin: '',
  page: 1,
};

export function InternshipProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [internships, setInternships] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // The search bar and the filters share ONE set of filters. It lives in a ref
  // so every change is applied immediately (not only after results come back),
  // which lets the search text and the filters combine no matter how quickly
  // they are used. `requestId` makes sure a slow, older response can never
  // overwrite the results of a newer search.
  const filtersRef = useRef(DEFAULT_FILTERS);
  const requestId = useRef(0);

  const fetchInternships = useCallback(async (overrides = {}) => {
    const merged = { ...filtersRef.current, ...overrides };
    filtersRef.current = merged;
    setFilters(merged);

    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await listInternships(merged);
      if (id !== requestId.current) return; // a newer search/filter already ran
      setInternships(data || []);
      setTotal(count || 0);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || 'Failed to load internships');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const updateFilters = useCallback((patch) => {
    const next = { ...filtersRef.current, ...patch, page: patch.page ?? 1 };
    filtersRef.current = next;
    setFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    filtersRef.current = DEFAULT_FILTERS;
    setFilters(DEFAULT_FILTERS);
  }, []);

  const value = { filters, internships, total, loading, error, fetchInternships, updateFilters, resetFilters };
  return <InternshipContext.Provider value={value}>{children}</InternshipContext.Provider>;
}

export function useInternships() {
  const ctx = useContext(InternshipContext);
  if (!ctx) throw new Error('useInternships must be used within an InternshipProvider');
  return ctx;
}
