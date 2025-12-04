// Widget helper render functions

import React from 'react';
import { RefreshCw, Download, Filter, TrendingUp } from 'lucide-react';
import { exportToExcel } from '../utils';

/**
 * Render widget refresh button
 */
export const renderWidgetRefresh = (widgetKey, widgetStates, handleWidgetRefresh) => {
  const state = widgetStates[widgetKey];
  return (
    <button
      className="widget-refresh-btn"
      onClick={() => handleWidgetRefresh(widgetKey)}
      disabled={state?.loading}
      title={state?.loading ? 'Refreshing...' : state?.error ? 'Retry' : 'Refresh this widget'}
    >
      <RefreshCw size={14} className={state?.loading ? 'spinning' : ''} />
    </button>
  );
};

/**
 * Render widget action buttons (export, filter, trend)
 */
export const renderWidgetActions = (
  widgetKey,
  widgetName,
  widgetStates,
  handleWidgetRefresh,
  setShowFilters,
  showFilters,
  setShowTrendChart,
  showTrendChart,
  historicalData,
  metrics,
  kycStatus,
  byProject,
  byCountryLanguage,
  bySource
) => {
  const hasData = true; // Can be enhanced to check actual data
  return (
    <div className="widget-actions">
      {hasData && (
        <>
          <button
            className="widget-action-btn"
            onClick={() => exportToExcel(widgetKey, null, widgetName, metrics, kycStatus, byProject, byCountryLanguage, bySource)}
            title={`Export ${widgetName} to Excel`}
          >
            <Download size={14} />
          </button>
          <button
            className="widget-action-btn"
            onClick={() => setShowFilters(prev => ({ ...prev, [widgetKey]: !prev[widgetKey] }))}
            title={`Filter ${widgetName}`}
          >
            <Filter size={14} />
          </button>
          {historicalData.length > 0 && (
            <button
              className="widget-action-btn"
              onClick={() => setShowTrendChart(prev => ({ ...prev, [widgetKey]: !prev[widgetKey] }))}
              title={`Show trend for ${widgetName}`}
            >
              <TrendingUp size={14} />
            </button>
          )}
        </>
      )}
      {renderWidgetRefresh(widgetKey, widgetStates, handleWidgetRefresh)}
    </div>
  );
};

/**
 * Render widget loading/error status
 */
export const renderWidgetStatus = (widgetKey, widgetStates, handleWidgetRefresh) => {
  const state = widgetStates[widgetKey];
  if (state?.loading) {
    return <div className="widget-loading">Loading...</div>;
  }
  if (state?.error) {
    return (
      <div className="widget-error">
        <span>Error: {state.error}</span>
        <button onClick={() => handleWidgetRefresh(widgetKey)} className="retry-btn">Retry</button>
      </div>
    );
  }
  return null;
};

/**
 * Render filter UI for a widget
 */
export const renderFilterUI = (widgetKey, showFilters, filters, setFilters, setShowFilters) => {
  if (!showFilters[widgetKey]) return null;
  
  const handleFilterChange = (value) => {
    if (widgetKey === 'kycStatus') {
      setFilters(prev => ({ ...prev, status: value }));
    } else if (widgetKey === 'byProject') {
      setFilters(prev => ({ ...prev, project: value }));
    } else if (widgetKey === 'byCountryLanguage') {
      setFilters(prev => ({ ...prev, country: value }));
    }
  };
  
  const handleClear = () => {
    if (widgetKey === 'kycStatus') {
      setFilters(prev => ({ ...prev, status: null }));
    } else if (widgetKey === 'byProject') {
      setFilters(prev => ({ ...prev, project: null }));
    } else if (widgetKey === 'byCountryLanguage') {
      setFilters(prev => ({ ...prev, country: null }));
    }
    setShowFilters(prev => ({ ...prev, [widgetKey]: false }));
  };
  
  const getFilterValue = () => {
    if (widgetKey === 'kycStatus') return filters.status || '';
    if (widgetKey === 'byProject') return filters.project || '';
    if (widgetKey === 'byCountryLanguage') return filters.country || '';
    return '';
  };
  
  const getPlaceholder = () => {
    if (widgetKey === 'kycStatus') return 'Filter by status...';
    if (widgetKey === 'byProject') return 'Filter by project name...';
    if (widgetKey === 'byCountryLanguage') return 'Filter by country...';
    return 'Filter...';
  };
  
  return (
    <div className="widget-filter-panel">
      <input
        type="text"
        placeholder={getPlaceholder()}
        value={getFilterValue()}
        onChange={(e) => handleFilterChange(e.target.value)}
        className="filter-input"
        autoFocus
      />
      <button
        className="filter-clear-btn"
        onClick={handleClear}
      >
        Clear
      </button>
    </div>
  );
};

