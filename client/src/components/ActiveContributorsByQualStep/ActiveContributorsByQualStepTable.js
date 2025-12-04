import React, { useState, useMemo } from 'react';
import { Download, Loader, RefreshCw, X, Search } from 'lucide-react';
import apiClient from '../../config/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const ActiveContributorsByQualStepTable = ({ 
  data, 
  loading, 
  onRefresh, 
  refreshing,
  loadingMore,
  hasMore,
  totalCount,
  infiniteScrollRef,
  tableContainerRef,
  searchTerm,
  onSearchChange
}) => {
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [selectedQualStepId, setSelectedQualStepId] = useState(null);
  const [selectedQualStepName, setSelectedQualStepName] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Format the count display: show "X / Total" if totalCount is available, otherwise just "X"
  const getCountDisplay = () => {
    const loadedCount = data ? data.length : 0;
    if (totalCount !== null && totalCount !== undefined && totalCount > 0) {
      return `${loadedCount} / ${totalCount}`;
    }
    return loadedCount.toString();
  };

  // Transform data - each row is a qualification step with project objective count
  // Filter out qualification steps with 0 contributors and sort by contributor count descending
  const flattenedData = useMemo(() => {
    const flattened = [];
    if (!data || !Array.isArray(data)) {
      console.warn('[Active Contributors by Qual Step] Data is not an array:', data);
      return [];
    }
    
    console.log('[Active Contributors by Qual Step] Processing data:', {
      totalItems: data.length,
      sampleItem: data[0],
      itemsWithContributors: data.filter(item => (item.activeContributorCount || 0) > 0).length
    });
    
    data.forEach((qualStep, index) => {
      // Check if activeContributorCount exists and is greater than 0
      const contributorCount = qualStep.activeContributorCount || 0;
      const projectObjCount = qualStep.projectObjectiveCount || 0;
      
      // Debug first few items
      if (index < 3) {
        console.log(`[Active Contributors by Qual Step] Item ${index}:`, {
          qualStepName: qualStep.qualStepName,
          projectObjectiveCount: projectObjCount,
          activeContributorCount: contributorCount,
          hasProjectObjectives: !!qualStep.projectObjectives,
          projectObjectivesLength: qualStep.projectObjectives?.length || 0
        });
      }
      
      // Only include qualification steps with contributors (count > 0)
      if (contributorCount > 0) {
        flattened.push({
          qualStepName: qualStep.qualStepName || '',
          qualStepId: qualStep.qualStepId || null,
          projectCount: qualStep.projectCount || 0,
          projectObjectiveCount: projectObjCount,
          activeContributorCount: contributorCount
        });
      }
    });
    
    // Sort by Active Contributor Count in descending order
    const sorted = flattened.sort((a, b) => (b.activeContributorCount || 0) - (a.activeContributorCount || 0));
    console.log('[Active Contributors by Qual Step] Flattened data:', sorted.length, 'rows after filtering');
    if (sorted.length === 0 && data.length > 0) {
      console.warn('[Active Contributors by Qual Step] All items filtered out! Sample item:', data[0]);
    }
    return sorted;
  }, [data]);

  const handleCountClick = async (qualStepId, qualStepName) => {
    if (!qualStepId || qualStepId === 'null') {
      return;
    }

    setSelectedQualStepId(qualStepId);
    setSelectedQualStepName(qualStepName);
    setShowContributorsModal(true);
    setLoadingContributors(true);
    setContributors([]);
    setModalSearchTerm('');

    try {
      const response = await apiClient.get(`/active-contributors-by-qual-step/contributors/${qualStepId}`, {
        timeout: 600000 // 10 minutes - large datasets can take time
      });
      if (response.data.success) {
        // Backend returns array of contributor objects with qualStepName, projectObjectiveName, contributor details
        setContributors(response.data.contributors || []);
      } else {
        toast.error(response.data.error || 'Failed to fetch contributor details');
        setShowContributorsModal(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch contributor details';
      toast.error(errorMessage);
      setShowContributorsModal(false);
    } finally {
      setLoadingContributors(false);
    }
  };

  const handleExportContributorsToExcel = () => {
    const exportData = filteredModalContributors;
    if (!exportData || exportData.length === 0) {
      toast.error('No contributors to export');
      return;
    }

    try {
      // Prepare data for Excel export
      const excelData = exportData.map((contributor, index) => ({
        'S.No': index + 1,
        'Qualification Step': contributor.qualStepName || '-',
        'Project Objective': contributor.projectObjectiveName || '-',
        'Project Qual Step': contributor.projectQualStepName || '-',
        'Contributor Name': contributor.contributorName || '-',
        'Email ID': contributor.contributorEmail || '-'
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Active Contributors');

      // Generate Excel file
      const fileName = `active_contributors_${(selectedQualStepName || 'qual_step').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Contributors exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export contributors to Excel');
    }
  };

  // Filter modal contributors based on search
  const filteredModalContributors = useMemo(() => {
    if (!modalSearchTerm.trim()) {
      return contributors;
    }
    
    const searchLower = modalSearchTerm.toLowerCase().trim();
    return contributors.filter(contributor => {
      const qualStepName = (contributor.qualStepName || '').toLowerCase();
      const projectObjectiveName = (contributor.projectObjectiveName || '').toLowerCase();
      const projectQualStepName = (contributor.projectQualStepName || '').toLowerCase();
      const contributorName = (contributor.contributorName || '').toLowerCase();
      const email = (contributor.contributorEmail || '').toLowerCase();
      
      return qualStepName.includes(searchLower) || 
             projectObjectiveName.includes(searchLower) ||
             projectQualStepName.includes(searchLower) ||
             contributorName.includes(searchLower) ||
             email.includes(searchLower);
    });
  }, [contributors, modalSearchTerm]);

  const handleExportCSV = () => {
    const exportData = flattenedData;
    if (!exportData || exportData.length === 0) return;
    
    const headers = [
      'Qualification Step',
      'Project Count',
      'Project Objective Count',
      'Active Contributor Count'
    ];
    
    const csvRows = [headers.join(',')];
    
    exportData.forEach(item => {
      const row = [
        `"${(item.qualStepName || '').replace(/"/g, '""')}"`,
        item.projectCount || 0,
        item.projectObjectiveCount || 0,
        item.activeContributorCount || 0
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `active_contributors_by_qual_step_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="case-table-loading">
        <Loader className="spinning" size={24} />
        <p>Loading Active Contributors by Qualification Step data...</p>
      </div>
    );
  }

  const totalRows = flattenedData.length;

  return (
    <>
      <div className="case-table-container" ref={tableContainerRef}>
        <div className="case-table-header">
          <h3>Active Contributors by Qualification Step ({getCountDisplay()})</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search Input */}
            <div className="table-search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by Qualification Step or Project Objective..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="table-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="search-clear-btn"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="btn-action"
              title="Refresh data"
              style={{ marginRight: '8px' }}
            >
              {refreshing ? <Loader size={16} className="spinning" /> : <RefreshCw size={16} />}
              <span>Refresh</span>
            </button>
            <button
              className="btn-export-csv"
              onClick={handleExportCSV}
              title="Export to CSV"
              disabled={!flattenedData || flattenedData.length === 0}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {!flattenedData || flattenedData.length === 0 ? (
          <div className="case-table-empty">
            <p>{searchTerm ? 'No results found for your search' : 'No data found'}</p>
          </div>
        ) : (
          <div className="case-table-scroll-wrapper">
            <table className="case-table">
                      <thead>
                        <tr>
                          <th>Qualification Step</th>
                          <th>Project Count</th>
                          <th>Project Objective Count</th>
                          <th>Active Contributor Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flattenedData.map((item, index) => (
                          <tr key={`${item.qualStepId}-${index}`} className="case-table-row">
                            <td>{item.qualStepName || ''}</td>
                            <td>{item.projectCount || 0}</td>
                            <td>{item.projectObjectiveCount || 0}</td>
                            <td>
                      {item.qualStepId && item.qualStepId !== 'null' ? (
                        <button
                          onClick={() => handleCountClick(item.qualStepId, item.qualStepName)}
                          className="count-link"
                          title="Click to view contributor names"
                        >
                          {item.activeContributorCount || 0}
                        </button>
                      ) : (
                        <span>{item.activeContributorCount || 0}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Search results info */}
            {searchTerm && (
              <div style={{ 
                padding: '12px 16px', 
                fontSize: '13px', 
                color: '#666',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb'
              }}>
                Showing {flattenedData.length} result{flattenedData.length !== 1 ? 's' : ''} for "{searchTerm}"
              </div>
            )}
            
            {/* Infinite scroll trigger and loading indicator */}
            {hasMore && !searchTerm && (
              <>
                {!loadingMore && (
                  <div
                    ref={infiniteScrollRef}
                    style={{ 
                      height: '50px', 
                      width: '100%', 
                      marginTop: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      padding: '10px'
                    }}>
                      Scroll for more...
                    </div>
                  </div>
                )}
                {loadingMore && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    padding: '20px',
                    gap: '12px'
                  }}>
                    <Loader className="spinning" size={20} style={{ color: '#0176d3' }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Loading more records...</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Contributors Modal */}
      {showContributorsModal && (
        <div className="modal-overlay" onClick={() => setShowContributorsModal(false)}>
          <div className="modal-content contributors-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Active Contributors - {selectedQualStepName}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {contributors.length > 0 && !loadingContributors && (
                  <button
                    onClick={handleExportContributorsToExcel}
                    className="btn-export-excel"
                    title="Export to Excel"
                  >
                    <Download size={16} />
                    <span>Export Excel</span>
                  </button>
                )}
                <button className="modal-close" onClick={() => setShowContributorsModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body">
              {loadingContributors ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '16px' }}>
                  <Loader className="spinning" size={24} />
                  <p>Loading contributors...</p>
                </div>
              ) : contributors.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No active contributors found</p>
              ) : (
                <div className="contributors-list">
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px', fontWeight: '500' }}>
                      Total: {contributors.length} contributor{contributors.length !== 1 ? 's' : ''}
                      {modalSearchTerm && ` (${filteredModalContributors.length} filtered)`}
                    </p>
                    {/* Search in Modal */}
                    <div className="modal-search-container">
                      <Search size={14} className="modal-search-icon" />
                      <input
                        type="text"
                        placeholder="Search contributors..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        className="modal-search-input"
                      />
                      {modalSearchTerm && (
                        <button
                          onClick={() => setModalSearchTerm('')}
                          className="modal-search-clear-btn"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="contributors-table-wrapper">
                    <table className="contributors-table">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Qualification Step</th>
                          <th>Project Objective</th>
                          <th>Project Qual Step</th>
                          <th>Contributor Name</th>
                          <th>Email ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModalContributors.map((contributor, index) => (
                          <tr key={contributor.id || index}>
                            <td>{index + 1}</td>
                            <td>{contributor.qualStepName || '-'}</td>
                            <td>{contributor.projectObjectiveName || '-'}</td>
                            <td>{contributor.projectQualStepName || '-'}</td>
                            <td>{contributor.contributorName || '-'}</td>
                            <td>{contributor.contributorEmail || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveContributorsByQualStepTable;

