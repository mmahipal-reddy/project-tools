// OverviewTab component for CrowdDashboard
// Extracted from CrowdDashboard.js

import React from 'react';
import { Download, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const OverviewTab = ({
  metrics,
  kycStatus,
  byCountry,
  byLanguage,
  byProject,
  byCountryLanguage,
  bySource,
  byContributorSource,
  byContributorStatus,
  byContributorType,
  historicalData,
  showTrendChart,
  setShowTrendChart,
  thresholds,
  getMetricColor,
  formatNumber,
  formatDate,
  exportToExcel,
  renderWidgetRefresh,
  renderWidgetStatus,
  renderWidgetActions,
  renderFilterUI,
  applyFilters,
  handleChartClick,
  handleWidgetRefresh,
  widgetStates
}) => {
  // Create wrapper functions that use the widgetStates prop
  const renderWidgetStatusWithState = (widgetKey) => {
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

  return (
    <div className="tab-content">
            {/* KPI Cards - Top Row */}
            <div className="kpi-grid">
              <div className={`kpi-card ${getMetricColor('targetHC', metrics.targetHC)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Target HC</span>
                  {metrics.targetHC < 33 && <span className="kpi-note">&lt; 33</span>}
                  <div className="widget-actions">
                    <button
                      className="widget-action-btn"
                      onClick={() => exportToExcel('baseMetrics', null, 'Target HC')}
                      title="Export to Excel"
                    >
                      <Download size={14} />
                    </button>
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'targetHC': !prev['targetHC'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('baseMetrics')}
                  </div>
                </div>
                {showTrendChart['targetHC'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.targetHC || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="kpi-value">{formatNumber(metrics.targetHC)}</div>
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('totalApplications', metrics.totalApplications)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Total Applications</span>
                  {metrics.totalApplications >= 67 && <span className="kpi-note">≥ 67</span>}
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'totalApplications': !prev['totalApplications'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('baseMetrics')}
                  </div>
                </div>
                {showTrendChart['totalApplications'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.totalApplications || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="kpi-value">{formatNumber(metrics.totalApplications)}</div>
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('totalQualified', metrics.totalQualified)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Total Qualified</span>
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'totalQualified': !prev['totalQualified'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('baseMetrics')}
                  </div>
                </div>
                {showTrendChart['totalQualified'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.totalQualified || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="kpi-value">{formatNumber(metrics.totalQualified)}</div>
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('totalActiveOnProjects', metrics.totalActiveOnProjects)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Total Active on Projects</span>
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'totalActiveOnProjects': !prev['totalActiveOnProjects'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('baseMetrics')}
                  </div>
                </div>
                {showTrendChart['totalActiveOnProjects'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.totalActiveOnProjects || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="kpi-value">{formatNumber(metrics.totalActiveOnProjects)}</div>
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('totalProductive', metrics.totalProductive)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Total Productive</span>
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'totalProductive': !prev['totalProductive'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('baseMetrics')}
                  </div>
                </div>
                {showTrendChart['totalProductive'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.totalProductive || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="kpi-value">{formatNumber(metrics.totalProductive)}</div>
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>
            </div>

            {/* KPI Cards - Middle Row */}
            <div className="kpi-grid">
              <div className={`kpi-card ${getMetricColor('onboardingContributors', metrics.onboardingContributors)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Onboarding Contributors</span>
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'onboardingContributors': !prev['onboardingContributors'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('onboardingContributors')}
                  </div>
                </div>
                {showTrendChart['onboardingContributors'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.onboardingContributors || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {renderWidgetStatusWithState('onboardingContributors') || (
                  <div className="kpi-value">{formatNumber(metrics.onboardingContributors)}</div>
                )}
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('activeContributors', metrics.activeContributors)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Active Contributors</span>
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'activeContributors': !prev['activeContributors'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('activeContributors')}
                  </div>
                </div>
                {showTrendChart['activeContributors'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.activeContributors || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {renderWidgetStatusWithState('activeContributors') || (
                  <div className="kpi-value">{formatNumber(metrics.activeContributors)}</div>
                )}
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('avgAppReceivedToActive', metrics.avgAppReceivedToActive)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Avg App Received to Active (days)</span>
                  {metrics.avgAppReceivedToActive < 33 && <span className="kpi-note">&lt;33</span>}
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'avgAppReceivedToActive': !prev['avgAppReceivedToActive'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('avgAppReceivedToActive')}
                  </div>
                </div>
                {showTrendChart['avgAppReceivedToActive'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.avgAppReceivedToActive || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {renderWidgetStatusWithState('avgAppReceivedToActive') || (
                  <div className="kpi-value">{metrics.avgAppReceivedToActive.toFixed(1)}</div>
                )}
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              <div className={`kpi-card ${getMetricColor('avgAppReceivedToApplied', metrics.avgAppReceivedToApplied)}`}>
                <div className="kpi-header">
                  <span className="kpi-label">Avg App Received to Applied (days)</span>
                  {metrics.avgAppReceivedToApplied < 15 && <span className="kpi-note">&lt;15</span>}
                  <div className="widget-actions">
                    {historicalData.length > 0 && (
                      <button
                        className="widget-action-btn"
                        onClick={() => setShowTrendChart(prev => ({ ...prev, 'avgAppReceivedToApplied': !prev['avgAppReceivedToApplied'] }))}
                        title="Show trend"
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    {renderWidgetRefresh('avgAppReceivedToApplied')}
                  </div>
                </div>
                {showTrendChart['avgAppReceivedToApplied'] && historicalData.length > 0 && (
                  <div className="kpi-trend-chart">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.metrics?.avgAppReceivedToApplied || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {renderWidgetStatusWithState('avgAppReceivedToApplied') || (
                  <div className="kpi-value">{metrics.avgAppReceivedToApplied.toFixed(1)}</div>
                )}
                <div className="kpi-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>
            </div>

            {/* Charts - Bottom Row */}
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="#08979C" />
                    <h3>Contributors KYC Status {kycStatus.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({kycStatus.length} transactions)</span>}</h3>
                  </div>
                  {renderWidgetActions('kycStatus', 'KYC Status', kycStatus.length > 0)}
                </div>
                {renderFilterUI('kycStatus')}
                {showTrendChart['kycStatus'] && historicalData.length > 0 && (
                  <div className="trend-chart-container">
                    <h4>Trend: Total KYC Status Count</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={historicalData.map(s => ({
                        date: new Date(s.timestamp).toLocaleDateString(),
                        value: s.kycStatus?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
                      })).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="chart-container scrollable-chart">
                  {renderWidgetStatusWithState('kycStatus') || (
                    (() => {
                      const filteredData = applyFilters(kycStatus, 'kycStatus');
                      return filteredData.length > 0 ? (
                        <div className="chart-scroll-wrapper">
                          <ResponsiveContainer width="100%" height={Math.min(Math.max(500, filteredData.length * 50), 1000)}>
                            <BarChart 
                              data={filteredData} 
                              layout="vertical"
                              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                              onClick={(data) => handleChartClick(data, 'kycStatus')}
                              throttleDelay={100}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                type="number" 
                                tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                                label={{ value: 'Count', position: 'insideBottom', offset: -10, style: { fontSize: 13, fontWeight: 600 } }}
                              />
                              <YAxis 
                                dataKey="status" 
                                type="category" 
                                width={120}
                                tick={{ fontSize: 13, fill: '#1f2937', fontWeight: 500 }}
                                interval={0}
                                angle={0}
                                textAnchor="end"
                                dx={-5}
                              />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="no-data">No KYC status data available</div>
                      );
                    })()
                  )}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)}</div>
              </div>

              {/* Active Contributors by Country-Language - NEW OPTIMIZED WIDGET */}
              <div className="chart-card">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="#08979C" />
                    <h3>Active Contributors by Country-Language {byCountryLanguage.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({byCountryLanguage.length} transactions)</span>}</h3>
                  </div>
                  {renderWidgetActions('byCountryLanguage', 'Country-Language', byCountryLanguage.length > 0)}
                </div>
                {renderFilterUI('byCountryLanguage')}
                <div className="chart-container scrollable-chart">
                  {renderWidgetStatusWithState('byCountryLanguage') || (
                    (() => {
                    const filteredData = applyFilters(byCountryLanguage, 'byCountryLanguage');
                      // Data is already sorted in descending order by API
                      if (filteredData.length === 0) {
                        return <div className="no-data">No country-language data available</div>;
                      }
                      
                      // Limit visible items to top 50 for better legibility
                      const MAX_VISIBLE_ITEMS = 50;
                      const visibleData = filteredData.slice(0, MAX_VISIBLE_ITEMS);
                      const hasMore = filteredData.length > MAX_VISIBLE_ITEMS;
                      
                      // Extract unique languages (excluding 'country' and 'total')
                      const languages = new Set();
                      visibleData.forEach(item => {
                        Object.keys(item).forEach(key => {
                          if (key !== 'country' && key !== 'total' && typeof item[key] === 'number' && item[key] > 0) {
                            languages.add(key);
                          }
                        });
                      });
                      const languageArray = Array.from(languages).sort();
                      
                      // Modern color palette
                      const colors = [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                        '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#06b6d4'
                      ];
                      const languageColors = {};
                      languageArray.forEach((lang, idx) => {
                        languageColors[lang] = colors[idx % colors.length];
                      });
                      
                      // Calculate height: minimum 50px per item for better readability
                      const chartHeight = Math.min(Math.max(600, visibleData.length * 50), 1200);
                      
                      return (
                        <div className="chart-scroll-wrapper">
                          {hasMore && (
                            <div style={{ 
                              padding: '8px 12px', 
                              background: '#f3f4f6', 
                              borderBottom: '1px solid #e5e7eb',
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              Showing top {MAX_VISIBLE_ITEMS} of {filteredData.length} countries. Use filter to find specific countries.
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart 
                              data={visibleData} 
                              layout="vertical" 
                              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                              onClick={(data) => handleChartClick(data, 'byCountryLanguage')}
                              throttleDelay={100}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                type="number" 
                                tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                                label={{ value: 'Contributors', position: 'insideBottom', offset: -10, style: { fontSize: 13, fontWeight: 600 } }}
                              />
                            <YAxis 
                              dataKey="country" 
                              type="category" 
                                width={150}
                                tick={{ fontSize: 13, fill: '#1f2937', fontWeight: 500 }}
                              interval={0}
                                angle={0}
                                textAnchor="end"
                                dx={-5}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                    const total = data.total || Object.values(data).reduce((sum, val) => 
                                      typeof val === 'number' && val > 0 ? sum + val : sum, 0
                                    );
                                  return (
                                      <div className="chart-tooltip" style={{ 
                                        background: 'white', 
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: '6px',
                                        padding: '12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                      }}>
                                        <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                                          {data.country}
                                        </p>
                                        <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                                          <strong>Total:</strong> {formatNumber(total)} contributors
                                        </p>
                                        {payload.filter(entry => entry.dataKey !== 'country' && entry.dataKey !== 'total' && entry.value > 0)
                                          .map((entry, idx) => (
                                            <p key={idx} style={{ marginBottom: '4px', fontSize: '12px' }}>
                                              <strong style={{ color: languageColors[entry.dataKey] || '#000' }}>
                                                {entry.dataKey}:
                                              </strong> {formatNumber(entry.value)}
                                            </p>
                                          ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                              {languageArray.length > 0 ? (
                                languageArray.map((language) => (
                              <Bar 
                                key={language}
                                dataKey={language} 
                                    fill={languageColors[language] || '#3b82f6'}
                                name={language}
                                stackId="country"
                                    radius={[0, 4, 4, 0]}
                                    isAnimationActive={false}
                                    minPointSize={2}
                                  />
                                ))
                              ) : (
                                // Fallback: show total if no language breakdown
                                <Bar 
                                  dataKey="total" 
                                  fill="#3b82f6"
                                  name="Total Contributors"
                                  radius={[0, 4, 4, 0]}
                                  isAnimationActive={false}
                                  minPointSize={2}
                                />
                              )}
                          </BarChart>
                        </ResponsiveContainer>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by total contributors (descending)</div>
              </div>

              {/* Active Contributors by Project - NEW OPTIMIZED WIDGET */}
              <div className="chart-card">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="#08979C" />
                    <h3>Active Contributors by Project {byProject.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({byProject.length} transactions)</span>}</h3>
                  </div>
                  {renderWidgetActions('byProject', 'By Project', byProject.length > 0)}
                </div>
                {renderFilterUI('byProject')}
                <div className="chart-container scrollable-chart">
                  {renderWidgetStatusWithState('byProject') || (
                    (() => {
                      const filteredData = applyFilters(byProject, 'byProject');
                      // Data is already sorted in descending order by API
                      if (filteredData.length === 0) {
                        return <div className="no-data">No project data available</div>;
                      }
                      
                      // Limit visible items to top 50 for better legibility
                      const MAX_VISIBLE_ITEMS = 50;
                      const visibleData = filteredData.slice(0, MAX_VISIBLE_ITEMS);
                      const hasMore = filteredData.length > MAX_VISIBLE_ITEMS;
                      
                      // Get max count for gradient
                      const maxCount = Math.max(...visibleData.map(d => d.count || 0));
                      
                      // Calculate height: minimum 55px per item for better readability and spacing
                      const chartHeight = Math.min(Math.max(650, visibleData.length * 55), 1400);
                      
                      // Truncate long project names for better display
                      const processedData = visibleData.map(item => ({
                        ...item,
                        displayName: item.projectName && item.projectName.length > 45 
                          ? item.projectName.substring(0, 42) + '...' 
                          : item.projectName
                      }));
                      
                      return (
                        <div className="chart-scroll-wrapper">
                          {hasMore && (
                            <div style={{ 
                              padding: '8px 12px', 
                              background: '#f3f4f6', 
                              borderBottom: '1px solid #e5e7eb',
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              Showing top {MAX_VISIBLE_ITEMS} of {filteredData.length} projects. Use filter to find specific projects.
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart 
                              data={processedData} 
                              layout="vertical"
                              margin={{ top: 15, right: 40, left: 0, bottom: 35 }}
                              onClick={(data) => handleChartClick(data, 'byProject')}
                              throttleDelay={100}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                type="number" 
                                tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }}
                                label={{ value: 'Active Contributors', position: 'insideBottom', offset: -12, style: { fontSize: 14, fontWeight: 600 } }}
                              />
                              <YAxis 
                                dataKey="displayName" 
                                type="category" 
                                width={220}
                                tick={{ fontSize: 12.5, fill: '#1f2937', fontWeight: 500 }}
                                interval={0}
                                angle={0}
                                textAnchor="end"
                                dx={-8}
                                tickFormatter={(value) => value || ''}
                              />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="chart-tooltip" style={{ 
                                        background: 'white', 
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: '6px',
                                        padding: '12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        maxWidth: '300px'
                                      }}>
                                        <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px', wordBreak: 'break-word' }}>
                                          {data.projectName}
                                        </p>
                                        <p style={{ fontSize: '13px', color: '#10b981' }}>
                                          <strong>Active Contributors:</strong> {formatNumber(data.count)}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar 
                                dataKey="count" 
                                fill="#10b981"
                                radius={[0, 4, 4, 0]}
                                isAnimationActive={false}
                              >
                                {filteredData.map((entry, index) => {
                                  // Use solid color - ensure visibility
                                  return (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill="#10b981"
                                    />
                                  );
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by contributor count (descending)</div>
              </div>
            </div>

            {/* Contributors by Source Details and Contributor Source Widgets - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Contributors by Source Details Widget */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Contributors by Source Details {bySource && bySource.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({bySource.length} transactions)</span>}</h3>
                  <div className="widget-actions">
                    {renderWidgetRefresh('bySource')}
                  </div>
                </div>
                {renderWidgetStatusWithState('bySource')}
                <div className="chart-container">
                {(() => {
                  const filteredData = bySource && bySource.length > 0 ? bySource : [];
                  const hasData = filteredData.length > 0;
                  
                  if (!hasData && !widgetStates.bySource?.loading) {
                    return (
                      <div className="no-data-message">
                        {widgetStates.bySource?.error ? `Error: ${widgetStates.bySource.error}` : 'No data available'}
                      </div>
                    );
                  }
                  
                  // Show all items - no limit
                  const displayData = filteredData;
                  const minHeight = 400;
                  const itemHeight = 35; // Reduced height per item to fit more
                  const chartHeight = Math.max(minHeight, displayData.length * itemHeight);
                  
                  return (
                    <div className="chart-scroll-wrapper" style={{ height: `${chartHeight}px`, minHeight: `${minHeight}px`, maxHeight: '800px', overflowY: 'auto' }}>
                      <ResponsiveContainer width="100%" height={chartHeight} minHeight={minHeight}>
                        <BarChart
                          data={displayData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                          throttleDelay={100}
                          isAnimationActive={false}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis 
                            type="number"
                            tick={{ fontSize: 13 }}
                            tickFormatter={(value) => formatNumber(value)}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="source"
                            width={250}
                            tick={{ fontSize: 11 }}
                            dx={-8}
                            angle={0}
                            textAnchor="end"
                            interval={0}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="chart-tooltip" style={{ 
                                    background: 'white', 
                                    border: '1px solid #e5e7eb', 
                                    borderRadius: '6px',
                                    padding: '12px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    maxWidth: '300px',
                                    wordBreak: 'break-word'
                                  }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                                      {data.source}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#08979C' }}>
                                      <strong>Contributors:</strong> {formatNumber(data.count)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#08979C"
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={false}
                            minPointSize={2}
                          >
                            {displayData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill="#08979C"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
              <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by contributor count (descending)</div>
            </div>

              {/* Contributors by Contributor Source Widget */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Contributors by Contributor Source {byContributorSource && byContributorSource.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({byContributorSource.length} transactions)</span>}</h3>
                  <div className="widget-actions">
                    {renderWidgetRefresh('byContributorSource')}
                  </div>
                </div>
                {renderWidgetStatusWithState('byContributorSource')}
                <div className="chart-container">
                  {(() => {
                    const filteredData = byContributorSource && byContributorSource.length > 0 ? byContributorSource : [];
                    const hasData = filteredData.length > 0;
                    
                    if (!hasData && !widgetStates.byContributorSource?.loading) {
                      return (
                        <div className="no-data-message">
                          {widgetStates.byContributorSource?.error ? `Error: ${widgetStates.byContributorSource.error}` : 'No data available'}
                        </div>
                      );
                    }
                    
                    // Show all items - no limit
                    const displayData = filteredData;
                    const minHeight = 400;
                    const itemHeight = 35; // Reduced height per item to fit more
                    const chartHeight = Math.max(minHeight, displayData.length * itemHeight);
                    
                    return (
                      <div className="chart-scroll-wrapper" style={{ height: `${chartHeight}px`, minHeight: `${minHeight}px`, maxHeight: '800px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={chartHeight} minHeight={minHeight}>
                          <BarChart
                            data={displayData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                            throttleDelay={100}
                            isAnimationActive={false}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis 
                              type="number"
                              tick={{ fontSize: 13 }}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="source"
                              width={250}
                              tick={{ fontSize: 11 }}
                              dx={-8}
                              angle={0}
                              textAnchor="end"
                              interval={0}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="chart-tooltip" style={{ 
                                      background: 'white', 
                                      border: '1px solid #e5e7eb', 
                                      borderRadius: '6px',
                                      padding: '12px',
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                      maxWidth: '300px',
                                      wordBreak: 'break-word'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                                        {data.source}
                                      </p>
                                      <p style={{ fontSize: '13px', color: '#08979C' }}>
                                        <strong>Contributors:</strong> {formatNumber(data.count)}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="#08979C"
                              radius={[0, 4, 4, 0]}
                              isAnimationActive={false}
                              minPointSize={2}
                            >
                              {displayData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill="#08979C"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by contributor count (descending)</div>
              </div>
            </div>

            {/* Contributors by Contributor Status and Contributor Type Widgets - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Contributors by Contributor Status Widget */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Contributors by Contributor Status {byContributorStatus && byContributorStatus.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({byContributorStatus.length} transactions)</span>}</h3>
                  <div className="widget-actions">
                    {renderWidgetRefresh('byContributorStatus')}
                  </div>
                </div>
                {renderWidgetStatusWithState('byContributorStatus')}
                <div className="chart-container">
                  {(() => {
                    const filteredData = byContributorStatus && byContributorStatus.length > 0 ? byContributorStatus : [];
                    const hasData = filteredData.length > 0;
                    
                    if (!hasData && !widgetStates.byContributorStatus?.loading) {
                      return (
                        <div className="no-data-message">
                          {widgetStates.byContributorStatus?.error ? `Error: ${widgetStates.byContributorStatus.error}` : 'No data available'}
                        </div>
                      );
                    }
                    
                    const displayData = filteredData;
                    const minHeight = 400;
                    const itemHeight = 35;
                    const chartHeight = Math.max(minHeight, displayData.length * itemHeight);
                    
                    return (
                      <div className="chart-scroll-wrapper" style={{ height: `${chartHeight}px`, minHeight: `${minHeight}px`, maxHeight: '800px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={chartHeight} minHeight={minHeight}>
                          <BarChart
                            data={displayData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                            throttleDelay={100}
                            isAnimationActive={false}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis 
                              type="number"
                              tick={{ fontSize: 13 }}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="status"
                              width={250}
                              tick={{ fontSize: 11 }}
                              dx={-8}
                              angle={0}
                              textAnchor="end"
                              interval={0}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="chart-tooltip" style={{ 
                                      background: 'white', 
                                      border: '1px solid #e5e7eb', 
                                      borderRadius: '6px',
                                      padding: '12px',
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                      maxWidth: '300px',
                                      wordBreak: 'break-word'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                                        {data.status}
                                      </p>
                                      <p style={{ fontSize: '13px', color: '#08979C' }}>
                                        <strong>Contributors:</strong> {formatNumber(data.count)}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="#08979C"
                              radius={[0, 4, 4, 0]}
                              isAnimationActive={false}
                              minPointSize={2}
                            >
                              {displayData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill="#08979C"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by contributor count (descending)</div>
              </div>

              {/* Contributors by Contributor Type Widget */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Contributors by Contributor Type {byContributorType && byContributorType.length > 0 && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({byContributorType.length} transactions)</span>}</h3>
                  <div className="widget-actions">
                    {renderWidgetRefresh('byContributorType')}
                  </div>
                </div>
                {renderWidgetStatusWithState('byContributorType')}
                <div className="chart-container">
                  {(() => {
                    const filteredData = byContributorType && byContributorType.length > 0 ? byContributorType : [];
                    const hasData = filteredData.length > 0;
                    
                    if (!hasData && !widgetStates.byContributorType?.loading) {
                      return (
                        <div className="no-data-message">
                          {widgetStates.byContributorType?.error ? `Error: ${widgetStates.byContributorType.error}` : 'No data available'}
                        </div>
                      );
                    }
                    
                    const displayData = filteredData;
                    const minHeight = 400;
                    const itemHeight = 35;
                    const chartHeight = Math.max(minHeight, displayData.length * itemHeight);
                    
                    return (
                      <div className="chart-scroll-wrapper" style={{ height: `${chartHeight}px`, minHeight: `${minHeight}px`, maxHeight: '800px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={chartHeight} minHeight={minHeight}>
                          <BarChart
                            data={displayData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                            throttleDelay={100}
                            isAnimationActive={false}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis 
                              type="number"
                              tick={{ fontSize: 13 }}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="type"
                              width={250}
                              tick={{ fontSize: 11 }}
                              dx={-8}
                              angle={0}
                              textAnchor="end"
                              interval={0}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="chart-tooltip" style={{ 
                                      background: 'white', 
                                      border: '1px solid #e5e7eb', 
                                      borderRadius: '6px',
                                      padding: '12px',
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                      maxWidth: '300px',
                                      wordBreak: 'break-word'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                                        {data.type}
                                      </p>
                                      <p style={{ fontSize: '13px', color: '#08979C' }}>
                                        <strong>Contributors:</strong> {formatNumber(data.count)}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="#08979C"
                              radius={[0, 4, 4, 0]}
                              isAnimationActive={false}
                              minPointSize={2}
                            >
                              {displayData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill="#08979C"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)} • Data sorted by contributor count (descending)</div>
              </div>
            </div>
    </div>
  );
};

export default OverviewTab;

