import React from 'react';
import { Target, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const ProjectCoverageAnalytics = ({ data }) => {
  if (!data) return null;

  const { totalRequired, withAccounts, withoutAccounts, coveragePercentage, projectsWithoutAccounts } = data;

  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '20px',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Target size={20} color="#0176d3" />
        Project Coverage Analytics
      </h3>

      {/* Coverage Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          padding: '16px', 
          background: '#f0f9ff', 
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Target size={20} color="#0176d3" />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>Total Required</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0176d3' }}>
            {totalRequired}
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          background: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle size={20} color="#059669" />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>With Accounts</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
            {withAccounts}
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          background: '#fef2f2', 
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <XCircle size={20} color="#dc2626" />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>Without Accounts</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
            {withoutAccounts}
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          background: '#fffbeb', 
          borderRadius: '8px',
          border: '1px solid #fde68a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <TrendingUp size={20} color="#d97706" />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>Coverage</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
            {coveragePercentage}%
          </div>
        </div>
      </div>

      {/* Coverage Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Coverage Progress</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#0176d3' }}>
            {coveragePercentage}%
          </span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '24px', 
          background: '#e5e7eb', 
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${coveragePercentage}%`, 
            height: '100%', 
            background: coveragePercentage >= 80 ? '#059669' : coveragePercentage >= 50 ? '#d97706' : '#dc2626',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {coveragePercentage > 10 && `${coveragePercentage}%`}
          </div>
        </div>
      </div>

      {/* Projects Without Accounts */}
      {projectsWithoutAccounts && projectsWithoutAccounts.length > 0 && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Projects Without Accounts ({projectsWithoutAccounts.length})
          </h4>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ 
                    padding: '10px 12px', 
                    textAlign: 'left', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Project Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectsWithoutAccounts.map((project) => (
                  <tr key={project.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                      {project.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCoverageAnalytics;

