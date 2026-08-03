import { useMemo, useState } from 'react';
import customers from '../data/customers.json';

const columns = [
  { key: 'customer', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'lastSeen', label: 'Last seen' },
  { key: 'orders', label: 'Orders' },
  { key: 'totalSpent', label: 'Total spent' },
  { key: 'latestPurchase', label: 'Latest purchase' },
  { key: 'newsletter', label: 'News' },
  { key: 'segment', label: 'Segment' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export default function DataGrid() {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('All');
  const [sortConfig, setSortConfig] = useState({
    key: 'customer',
    direction: 'ascending',
  });
  const [selectedRows, setSelectedRows] = useState([]);

  const filteredAndSortedCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = customers.filter((customer) => {
      const matchesSegment = segment === 'All' || customer.segment === segment;
      // const latestPurchaseFormatted = customer.latestPurchase ? formatDate(customer.latestPurchase) : '';
      const searchableText = [
        customer.customer,
        customer.email,
        customer.segment,
        customer.orders,
        customer.totalSpent,
        // customer.latestPurchase,
        // latestPurchaseSearch,
      ]
        .join(' ')
        .toLowerCase();

      return matchesSegment && searchableText.includes(normalizedQuery);
    });

    return [...filtered].sort((first, second) => {
      const firstValue = first[sortConfig.key];
      const secondValue = second[sortConfig.key];

      if (firstValue == null && secondValue == null) return 0;
      if (firstValue == null) return 1;
      if (secondValue == null) return -1;

      const comparison =
        typeof firstValue === 'string'
          ? firstValue.localeCompare(secondValue)
          : Number(firstValue) - Number(secondValue);

      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
  }, [query, segment, sortConfig]);

  const visibleIds = filteredAndSortedCustomers.map((customer) => customer.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedRows.includes(id));

  const requestSort = (key) => {
    setSortConfig((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  };

  const toggleRow = (customerId) => {
    setSelectedRows((currentRows) =>
      currentRows.includes(customerId)
        ? currentRows.filter((id) => id !== customerId)
        : [...currentRows, customerId],
    );
  };

  const toggleAllVisibleRows = () => {
    setSelectedRows((currentRows) => {
      if (allVisibleSelected) {
        return currentRows.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...currentRows, ...visibleIds])];
    });
  };

  return (
    <article className="card data-grid-card">
      <div className="data-grid-toolbar">
        <label className="search-field">
          <span>Search grid</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, email, segment, latest purchase..."
          />
        </label>

        <label>
          Segment
          <select value={segment} onChange={(event) => setSegment(event.target.value)}>
            <option>All</option>
            <option>New</option>
            <option>Regular</option>
            <option>VIP</option>
          </select>
        </label>

        <div className="grid-summary">
          <strong>{filteredAndSortedCustomers.length}</strong>
          <span>visible rows</span>
        </div>
        <div className="grid-summary">
          <strong>{selectedRows.length}</strong>
          <span>selected</span>
        </div>
      </div>

      <div className="table-wrap data-grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisibleRows}
                  aria-label="Select all visible rows"
                />
              </th>
              {columns.map((column) => {
                const isActive = sortConfig.key === column.key;
                const directionSymbol =
                  sortConfig.direction === 'ascending' ? '▲' : '▼';

                return (
                  <th key={column.key}>
                    <button
                      className="sort-button"
                      type="button"
                      onClick={() => requestSort(column.key)}
                    >
                      {column.label}
                      <span aria-hidden="true">{isActive ? directionSymbol : '↕'}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCustomers.length > 0 ? (
              filteredAndSortedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={selectedRows.includes(customer.id) ? 'row-selected' : ''}
                >
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(customer.id)}
                      onChange={() => toggleRow(customer.id)}
                      aria-label={`Select ${customer.customer}`}
                    />
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="avatar" aria-hidden="true">
                        {customer.customer
                          .split(' ')
                          .map((name) => name[0])
                          .join('')}
                      </span>
                      <strong>{customer.customer}</strong>
                    </div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{formatDate(customer.lastSeen)}</td>
                  <td className="numeric-cell">{customer.orders}</td>
                  <td className="numeric-cell">
                    {currencyFormatter.format(customer.totalSpent)}
                  </td>
                  <td>
                    {customer.latestPurchase
                      ? formatDate(customer.latestPurchase)
                      : '—'}
                  </td>
                  <td>
                    <span
                      className={`boolean-status ${
                        customer.newsletter ? 'is-yes' : 'is-no'
                      }`}
                    >
                      {customer.newsletter ? '✓' : '×'}
                    </span>
                  </td>
                  <td>
                    <span className={`segment segment--${customer.segment.toLowerCase()}`}>
                      {customer.segment}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="empty-state">No customer records match the filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}
