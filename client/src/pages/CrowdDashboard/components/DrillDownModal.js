// Drill-Down Modal Component

import React from 'react';
import { X } from 'lucide-react';

const DrillDownModal = ({ drillDownData, onClose }) => {
  if (!drillDownData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Drill-Down Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="drill-down-content">
            <pre>{JSON.stringify(drillDownData.data, null, 2)}</pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrillDownModal;

