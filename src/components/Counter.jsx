import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <article className="card counter-card">
      <p className="card-label">Current counter value</p>
      <output className="counter-value" aria-live="polite">
        {count}
      </output>
      <div className="counter-actions">
        <button
          className="button button--danger"
          type="button"
          onClick={() => setCount((currentCount) => currentCount - 1)}
        >
          − Decrease
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setCount(0)}
        >
          Reset
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setCount((currentCount) => currentCount + 1)}
        >
          + Increase
        </button>
      </div>
    </article>
  );
}
