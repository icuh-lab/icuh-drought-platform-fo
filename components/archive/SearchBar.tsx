"use client";
import { useState } from "react";

type Props = { initialValue: string; onSearch: (query: string) => void };

export function SearchBar({ initialValue, onSearch }: Props) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="filter-group"
      onSubmit={(e) => { e.preventDefault(); onSearch(value.trim()); }}
    >
      <input
        type="search"
        value={value}
        placeholder="제목으로 검색"
        onChange={(e) => setValue(e.target.value)}
        aria-label="검색어"
      />
      <button type="submit" className="nav-btn">검색</button>
    </form>
  );
}
