// Threshold Configuration Modal Component

import React from 'react';
import { X } from 'lucide-react';
import { saveThresholds } from '../utils';

const ThresholdModal = ({ show, onClose, thresholds, setThresholds }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configure Thresholds</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="threshold-config">
            <div className="threshold-item">
              <label>Target HC - Max Value (Red if exceeded):</label>
              <input
                type="number"
                value={thresholds.targetHC?.max || ''}
                onChange={(e) => {
                  const newThresholds = { ...thresholds };
                  newThresholds.targetHC = { ...newThresholds.targetHC, max: parseFloat(e.target.value) || 0 };
                  setThresholds(newThresholds);
                }}
              />
            </div>
            <div className="threshold-item">
              <label>Total Applications - Min Value (Green if met):</label>
              <input
                type="number"
                value={thresholds.totalApplications?.min || ''}
                onChange={(e) => {
                  const newThresholds = { ...thresholds };
                  newThresholds.totalApplications = { ...newThresholds.totalApplications, min: parseFloat(e.target.value) || 0 };
                  setThresholds(newThresholds);
                }}
              />
            </div>
            <div className="threshold-item">
              <label>Avg App Received to Applied - Max Days (Green if below):</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.avgAppReceivedToApplied?.max || ''}
                onChange={(e) => {
                  const newThresholds = { ...thresholds };
                  newThresholds.avgAppReceivedToApplied = { ...newThresholds.avgAppReceivedToApplied, max: parseFloat(e.target.value) || 0 };
                  setThresholds(newThresholds);
                }}
              />
            </div>
            <div className="threshold-item">
              <label>Avg App Received to Active - Max Days (Green if below):</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.avgAppReceivedToActive?.max || ''}
                onChange={(e) => {
                  const newThresholds = { ...thresholds };
                  newThresholds.avgAppReceivedToActive = { ...newThresholds.avgAppReceivedToActive, max: parseFloat(e.target.value) || 0 };
                  setThresholds(newThresholds);
                }}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => {
            saveThresholds(thresholds);
            onClose();
          }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThresholdModal;

