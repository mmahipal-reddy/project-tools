import { useState, useEffect } from 'react';

/**
 * Custom hook to track the actual width of the sidebar element
 * This allows pages to adjust their content width dynamically when the sidebar is resized
 * 
 * @param {boolean} sidebarOpen - Whether the sidebar is currently open
 * @returns {number} The current width of the sidebar in pixels
 */
const useSidebarWidth = (sidebarOpen) => {
  const [sidebarWidth, setSidebarWidth] = useState(sidebarOpen ? 320 : 80);

  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      // Fallback: set based on sidebarOpen state
      setSidebarWidth(sidebarOpen ? 320 : 80);
      return;
    }

    const updateSidebarWidth = () => {
      const width = sidebar.offsetWidth;
      if (width > 0) {
        setSidebarWidth(width);
      } else {
        // Fallback if width is 0
        setSidebarWidth(sidebarOpen ? 320 : 80);
      }
    };

    // Initial width - use a small delay to ensure sidebar is rendered
    const timeoutId = setTimeout(updateSidebarWidth, 0);

    // Watch for width changes using ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updateSidebarWidth();
    });

    resizeObserver.observe(sidebar);

    // Also listen for transition end (when sidebar opens/closes)
    sidebar.addEventListener('transitionend', updateSidebarWidth);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      sidebar.removeEventListener('transitionend', updateSidebarWidth);
    };
  }, [sidebarOpen]);

  return sidebarWidth;
};

export default useSidebarWidth;

