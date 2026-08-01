import { useState } from 'react';

const learnerRecords = [
  { id: 1, name: 'Aarav Sharma', course: 'React Basics', score: 86 },
  { id: 2, name: 'Meera Patel', course: 'JavaScript', score: 92 },
  { id: 3, name: 'Kabir Singh', course: 'UI Development', score: 78 },
  { id: 4, name: 'Nisha Verma', course: 'React Hooks', score: 89 },
];

export default function TaskOne() {
  const [isMessageVisible, setIsMessageVisible] = useState(true);
  const [isActionEnabled, setIsActionEnabled] = useState(false);
  const [buttonMessage, setButtonMessage] = useState('No action performed yet.');
  const [textValue, setTextValue] = useState('React makes UI interactive');
  const [children, setChildren] = useState([1]);
  const [firstNumber, setFirstNumber] = useState('10');
  const [secondNumber, setSecondNumber] = useState('20');

  const addChild = () => {
    setChildren((currentChildren) => [
      ...currentChildren,
      (currentChildren.at(-1) ?? 0) + 1,
    ]);
  };

  const removeChild = (childId) => {
    setChildren((currentChildren) =>
      currentChildren.filter((id) => id !== childId),
    );
  };

  const sum = (Number(firstNumber) || 0) + (Number(secondNumber) || 0);

  return (
    <div className="learning-grid">
      <article className="card card--accent">
        <p className="card-label">Display simple JSX</p>
        <h3>Hello from React JSX 👋</h3>
        <p>
          Today is{' '}
          <strong>
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(
              new Date(),
            )}
          </strong>
          .
        </p>
      </article>

      <article className="card card--span-2">
        <div className="card-header">
          <div>
            <p className="card-label">Display an array of records</p>
            <h3>Learner records</h3>
          </div>
          <span className="badge">{learnerRecords.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Course</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {learnerRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>{record.course}</td>
                  <td>
                    <span className="score-pill">{record.score}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <p className="card-label">Show / hide element</p>
        <h3>Conditional rendering</h3>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setIsMessageVisible((visible) => !visible)}
        >
          {isMessageVisible ? 'Hide message' : 'Show message'}
        </button>
        {isMessageVisible && (
          <p className="status-message success">This element is currently visible.</p>
        )}
      </article>

      <article className="card">
        <p className="card-label">Enable / disable a button</p>
        <h3>Button state</h3>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={isActionEnabled}
            onChange={(event) => setIsActionEnabled(event.target.checked)}
          />
          Enable action button
        </label>
        <button
          className="button"
          type="button"
          disabled={!isActionEnabled}
          onClick={() => setButtonMessage('The enabled button was clicked!')}
        >
          Perform action
        </button>
        <p className="helper-text">{buttonMessage}</p>
      </article>

      <article className="card">
        <p className="card-label">Two-way data binding</p>
        <h3>Controlled textbox</h3>
        <label>
          Your text
          <input
            type="text"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="Type something..."
          />
        </label>
        <div className="live-preview">
          <span>Live value</span>
          <strong>{textValue || 'Nothing entered yet'}</strong>
        </div>
      </article>

      <article className="card card--span-2">
        <div className="card-header">
          <div>
            <p className="card-label">Dynamically add child components</p>
            <h3>Dynamic child cards</h3>
          </div>
          <button className="button" type="button" onClick={addChild}>
            + Add child
          </button>
        </div>
        <div className="child-list">
          {children.length === 0 ? (
            <p className="empty-state">No child components. Add one to continue.</p>
          ) : (
            children.map((childId) => (
              <ChildCard key={childId} id={childId} onRemove={removeChild} />
            ))
          )}
        </div>
      </article>

      <article className="card">
        <p className="card-label">Sum of two numbers</p>
        <h3>Instant calculator</h3>
        <div className="number-row">
          <label>
            First number
            <input
              type="number"
              value={firstNumber}
              onChange={(event) => setFirstNumber(event.target.value)}
            />
          </label>
          <span aria-hidden="true">+</span>
          <label>
            Second number
            <input
              type="number"
              value={secondNumber}
              onChange={(event) => setSecondNumber(event.target.value)}
            />
          </label>
        </div>
        <div className="sum-result" aria-live="polite">
          Result: <strong>{sum}</strong>
        </div>
      </article>
    </div>
  );
}

function ChildCard({ id, onRemove }) {
  return (
    <div className="child-card">
      <div>
        <span>Child component</span>
        <strong>#{id}</strong>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={() => onRemove(id)}
        aria-label={`Remove child component ${id}`}
      >
        ×
      </button>
    </div>
  );
}
