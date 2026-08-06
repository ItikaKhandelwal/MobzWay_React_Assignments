import { useEffect } from 'react';

/**
 * Adds reliable vertical page auto-scroll while a native drag operation is
 * active. Some browsers do not consistently scroll long React boards when a
 * dragged card reaches the top or bottom edge of the viewport.
 */
export function useDragAutoScroll(isDragging) {
  useEffect(() => {
    if (!isDragging) return undefined;

    let animationFrame = 0;
    let scrollSpeed = 0;

    const stopScrolling = () => {
      scrollSpeed = 0;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const scrollPage = () => {
      if (!scrollSpeed) {
        animationFrame = 0;
        return;
      }

      window.scrollBy({ top: scrollSpeed, left: 0, behavior: 'auto' });
      animationFrame = requestAnimationFrame(scrollPage);
    };

    const handleDragOver = (event) => {
      const edgeSize = Math.min(120, window.innerHeight * 0.18);
      const maxSpeed = 22;
      let nextSpeed = 0;

      if (event.clientY < edgeSize) {
        const intensity = (edgeSize - event.clientY) / edgeSize;
        nextSpeed = -Math.max(4, Math.round(maxSpeed * intensity));
      } else if (event.clientY > window.innerHeight - edgeSize) {
        const intensity =
          (event.clientY - (window.innerHeight - edgeSize)) / edgeSize;
        nextSpeed = Math.max(4, Math.round(maxSpeed * intensity));
      }

      scrollSpeed = nextSpeed;

      if (scrollSpeed && !animationFrame) {
        animationFrame = requestAnimationFrame(scrollPage);
      } else if (!scrollSpeed) {
        stopScrolling();
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', stopScrolling);
    document.addEventListener('dragend', stopScrolling);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', stopScrolling);
      document.removeEventListener('dragend', stopScrolling);
      stopScrolling();
    };
  }, [isDragging]);
}
