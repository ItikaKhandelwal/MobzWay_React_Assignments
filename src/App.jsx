import TaskOne from './components/TaskOne.jsx';
import Counter from './components/Counter.jsx';
import SearchFilter from './components/SearchFilter.jsx';
import DataGrid from './components/DataGrid.jsx';
import DragDropBoard from './components/DragDropBoard.jsx';
import TaskSixTodo from './components/TaskSixTodo.jsx';
import BackOfficePanel from './components/BackOfficePanel.jsx';

const sections = [
  { id: 'task-1', label: 'Task 1' },
  { id: 'task-2', label: 'Task 2' },
  { id: 'task-3', label: 'Task 3' },
  { id: 'task-4', label: 'Task 4' },
  { id: 'task-5', label: 'Task 5' },
  { id: 'task-6', label: 'Task 6' },
  { id: 'task-7', label: 'Task 7' },
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">REACT.JS</p>
          <h1>Programming Assignment</h1>
          <p>
            A single React application implementing all seven assignment tasks
            using reusable functional components and React state.
          </p>
        </div>
      </header>

      <nav className="task-nav" aria-label="Assignment sections">
        {sections.map((section) => (
          <a href={`#${section.id}`} key={section.id}>
            {section.label}
          </a>
        ))}
      </nav>

      <main className="page-content">
        <section id="task-1" className="assignment-section">
          <SectionHeading
            number="01"
            title="Small Programming Learning Tasks"
            description="JSX, arrays, conditional rendering, controlled inputs, dynamic components and arithmetic."
          />
          <TaskOne />
        </section>

        <section id="task-2" className="assignment-section">
          <SectionHeading
            number="02"
            title="Counter"
            description="Increase, decrease and reset a value using React state."
          />
          <Counter />
        </section>

        <section id="task-3" className="assignment-section">
          <SectionHeading
            number="03"
            title="Search Filter"
            description="Filter an array in real time from a controlled textbox."
          />
          <SearchFilter />
        </section>

        <section id="task-4" className="assignment-section assignment-section--wide">
          <SectionHeading
            number="04"
            title="Sortable Data Grid"
            description="Static JSON data with sorting, searching, filtering and row selection."
          />
          <DataGrid />
        </section>

        <section id="task-5" className="assignment-section assignment-section--wide">
          <SectionHeading
            number="05"
            title="Drag & Drop Task List"
            description="Move tasks between Today, Tomorrow, This Week, Next Week and Unplanned."
          />
          <DragDropBoard />
        </section>

        <section id="task-6" className="assignment-section assignment-section--wide">
          <SectionHeading
            number="06"
            title="User To-Do Application"
            description="Sign up or log in, create lists and tasks, then move tasks and change priority using drag-and-drop."
          />
          <TaskSixTodo />
        </section>

        <section id="task-7" className="assignment-section assignment-section--wide">
          <SectionHeading
            number="07"
            title="Back Office Panel"
            description="View users individually, inspect their lists and tasks, and optionally load shared Firebase data."
          />
          <BackOfficePanel />
        </section>
      </main>

      <footer>
        Built with React functional components, hooks and native browser drag-and-drop.
      </footer>
    </div>
  );
}

function SectionHeading({ number, title, description }) {
  return (
    <div className="section-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
