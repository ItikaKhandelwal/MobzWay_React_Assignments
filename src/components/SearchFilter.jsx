import { useMemo, useState } from 'react';

const technologies = [
  { id: 1, name: 'React', category: 'Frontend', level: 'Intermediate' },
  { id: 2, name: 'JavaScript', category: 'Language', level: 'Beginner' },
  { id: 3, name: 'TypeScript', category: 'Language', level: 'Intermediate' },
  { id: 4, name: 'Node.js', category: 'Backend', level: 'Intermediate' },
  { id: 5, name: 'Express', category: 'Backend', level: 'Intermediate' },
  { id: 6, name: 'MongoDB', category: 'Database', level: 'Beginner' },
  { id: 7, name: 'PostgreSQL', category: 'Database', level: 'Advanced' },
  { id: 8, name: 'CSS', category: 'Frontend', level: 'Beginner' },
];

export default function SearchFilter() {
  const [query, setQuery] = useState('');

  const filteredTechnologies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return technologies;

    return technologies.filter((technology) =>
      Object.values(technology).some((value) =>
        String(value).toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query]);

  return (
    <article className="card">
      <div className="search-toolbar">
        <label className="search-field">
          <span>Search technologies</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try React, Backend or Advanced..."
          />
        </label>
        <span className="result-count">
          {filteredTechnologies.length} of {technologies.length} results
        </span>
      </div>

      {filteredTechnologies.length > 0 ? (
        <div className="filter-results">
          {filteredTechnologies.map((technology) => (
            <div className="technology-card" key={technology.id}>
              <strong>{technology.name}</strong>
              <span>{technology.category}</span>
              <small>{technology.level}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No technologies match “{query}”. Try another search.
        </div>
      )}
    </article>
  );
}
