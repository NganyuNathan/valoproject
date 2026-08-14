import React, { useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import './SearchBar.css';

export default function SearchBar({ defaultValue = '', placeholder = 'Search by title, company, skill or location', onSearch, size = 'md' }) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(value.trim());
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
