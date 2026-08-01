import { useState } from 'react';

const columnDefinitions = [
  { id: 'today', title: 'Today' },
  { id: 'tomorrow', title: 'Tomorrow' },
  { id: 'thisWeek', title: 'This Week' },
  { id: 'nextWeek', title: 'Next Week' },
  { id: 'unplanned', title: 'Unplanned' },
];

const initialBoard = {
  today: [],
  tomorrow: [],
  thisWeek: [],
  nextWeek: [],
  unplanned: Array.from({ length: 10 }, (_, index) => ({
    id: `task-${index + 1}`,
    title: `Test Task ${index + 1}`,
  })),
};

export default function DragDropBoard() {
  const [board, setBoard] = useState(initialBoard);
  const [draggedTask, setDraggedTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);

  const moveTask = (taskId, fromColumn, toColumn) => {
    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    setBoard((currentBoard) => {
      const taskToMove = currentBoard[fromColumn].find((task) => task.id === taskId);
      if (!taskToMove) return currentBoard;

      return {
        ...currentBoard,
        [fromColumn]: currentBoard[fromColumn].filter((task) => task.id !== taskId),
        [toColumn]: [...currentBoard[toColumn], taskToMove],
      };
    });
  };

  const handleDragStart = (event, task, columnId) => {
    const dragData = { taskId: task.id, fromColumn: columnId };
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'move';
    setDraggedTask(dragData);
  };

  const handleDrop = (event, toColumn) => {
    event.preventDefault();

    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      moveTask(data.taskId, data.fromColumn, toColumn);
    } catch {
      if (draggedTask) {
        moveTask(draggedTask.taskId, draggedTask.fromColumn, toColumn);
      }
    } finally {
      setDraggedTask(null);
      setActiveColumn(null);
    }
  };

  return (
    <article className="card board-card">
      <div className="board-toolbar">
        <p>
          Drag any task card and drop it inside another block. All 10 tasks begin
          in <strong>Unplanned</strong>.
        </p>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setBoard(initialBoard)}
        >
          Reset board
        </button>
      </div>

      <div className="kanban-board">
        {columnDefinitions.map((column) => (
          <section
            className={`kanban-column kanban-column--${column.id} ${
              activeColumn === column.id ? 'is-drag-over' : ''
            }`}
            key={column.id}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setActiveColumn(column.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setActiveColumn(null);
              }
            }}
            onDrop={(event) => handleDrop(event, column.id)}
          >
            <header>
              <h3>{column.title}</h3>
              <span>{board[column.id].length}</span>
            </header>

            <div className="task-drop-zone">
              {board[column.id].length > 0 ? (
                board[column.id].map((task) => (
                  <div
                    className={`task-card ${
                      draggedTask?.taskId === task.id ? 'is-dragging' : ''
                    }`}
                    draggable
                    key={task.id}
                    onDragStart={(event) => handleDragStart(event, task, column.id)}
                    onDragEnd={() => {
                      setDraggedTask(null);
                      setActiveColumn(null);
                    }}
                  >
                    <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                    <strong>{task.title}</strong>
                    <select
                      aria-label={`Move ${task.title} to another block`}
                      value={column.id}
                      onChange={(event) => moveTask(task.id, column.id, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => event.stopPropagation()}
                    >
                      {columnDefinitions.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <div className="column-empty">Drop tasks here</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
