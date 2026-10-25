import React, { useEffect, useRef, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import useDebounce from '../../hooks/useDebounce';
import './SearchBar.css';

// `live` also searches while typing (after a short pause), so the search bar
// and the filters can be used together without pressing Search each time.
export default function SearchBar({ defaultValue = '', placeholder = 'Search by title, company, skill or location', onSearch, size = 'md', live = false }) {
  const [value, setValue] = useState(defaultValue);
  const lastSent = useRef(defaultValue.trim());
  const debounced = useDebounce(value, 400);

  // Keep the box in sync when the search is changed elsewhere (e.g. Reset or a link).
  useEffect(() => {
    if (value.trim() !== defaultValue) {
      setValue(defaultValue);
      lastSent.current = defaultValue.trim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  useEffect(() => {
    if (!live) return;
    const q = debounced.trim();
    if (q !== lastSent.current) {
      lastSent.current = q;
      onSearch?.(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, live]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = value.trim();
    lastSent.current = q;
    onSearch?.(q);
  };

  return (
    <form className={`searchbar searchbar--${size}`} onSubmit={handleSubmit} role="search">
      <HiOutlineSearch className="searchbar__icon" />
      <input
        className="searchbar__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search internships"
      />
      <button type="submit" className="btn btn-primary searchbar__btn">Search</button>
    </form>
  );
}
