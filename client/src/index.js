import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress WebSocket errors from React's hot reload (harmless)
if (process.env.NODE_ENV === 'development') {
  // Suppress console.error for WebSocket errors
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const errorMessage = args.join(' ');
    // Filter out WebSocket connection errors from React's hot reload
    if (errorMessage.includes('WebSocket') || 
        errorMessage.includes('ws://') || 
        errorMessage.includes('Invalid frame header') ||
        errorMessage.includes('WebSocketClient')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const warnMessage = args.join(' ');
    // Filter out WebSocket warnings
    if (warnMessage.includes('WebSocket') || 
        warnMessage.includes('ws://') || 
        warnMessage.includes('Invalid frame header')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Suppress unhandled WebSocket errors at the window level
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && (
      message.toString().includes('WebSocket') || 
      message.toString().includes('ws://') ||
      message.toString().includes('Invalid frame header') ||
      message.toString().includes('WebSocketClient')
    )) {
      return true; // Suppress the error
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Global error handler for uncaught errors (including WebSocket suppression)
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    
    // Suppress WebSocket errors from React's hot reload
    if (message.includes('WebSocket') || 
        message.includes('ws://') ||
        message.includes('Invalid frame header') ||
        message.includes('WebSocketClient')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    
    // Log other errors in development (only if error has meaningful information)
    if (process.env.NODE_ENV === 'development') {
      const hasErrorInfo = event.message || event.filename || event.error;
      if (hasErrorInfo) {
        console.error('Global error caught:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      }
    }
    // Don't prevent default - let ErrorBoundary handle it
  }, true);

  // Global unhandled promise rejection handler (including WebSocket suppression)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.toString() || '';
    
    // Suppress WebSocket promise rejections
    if (reason.includes('WebSocket') || 
        reason.includes('ws://') ||
        reason.includes('Invalid frame header') ||
        reason.includes('WebSocketClient')) {
      event.preventDefault();
      return false;
    }
    
    // Log other promise rejections in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled promise rejection:', event.reason);
    }
    // Don't prevent default - let ErrorBoundary handle it
  });
}

// Performance test utility (available in browser console)
if (process.env.NODE_ENV === 'development') {
  window.testFieldSearchPerformance = async () => {
    console.log('🔍 Field Search Performance Test');
    console.log('================================\n');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found. Please log in first.');
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/projects/field-definitions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const fields = data.fields || [];
      
      const currentFields = new Set([
        'projectName', 'shortProjectName', 'contributorProjectName', 'appenPartner', 'projectType', 'projectPriority',
        'account', 'hireStartDate', 'predictedCloseDate', 'projectStatus', 'projectManager',
        'contributorFacingProjectName', 'projectObjectiveName', 'project', 'workType', 'daysBetweenReminderEmails', 'country', 'language',
        'qualificationStepProject', 'qualificationStepProjectObjective', 'qualificationStep', 'funnel', 'stepNumber', 'numberOfAttempts',
        'projectPageType', 'pageProject', 'pageProjectObjective', 'pageQualificationStep', 'active'
      ]);
      
      const availableFields = fields.filter(f => !currentFields.has(f.key));
      console.log(`Total available fields: ${availableFields.length}\n`);
      
      // OLD SEARCH IMPLEMENTATION
      const oldSearch = (searchTerm, selectedSection) => {
        const start = performance.now();
        let filtered = availableFields;
        
        if (selectedSection) {
          filtered = filtered.filter(field => field.section === selectedSection);
        }
        
        if (searchTerm && searchTerm.length >= 2) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter(field => {
            const labelLower = field.label.toLowerCase();
            const descLower = (field.description || '').toLowerCase();
            const keyLower = field.key.toLowerCase();
            return labelLower.indexOf(searchLower) !== -1 ||
                   descLower.indexOf(searchLower) !== -1 ||
                   keyLower.indexOf(searchLower) !== -1;
          });
        }
        
        return { results: filtered.length, time: performance.now() - start };
      };
      
      // NEW SEARCH IMPLEMENTATION
      const preprocessedFields = availableFields.map(field => {
        const label = field.label;
        const desc = field.description || '';
        const key = field.key;
        return {
          ...field,
          _labelLower: label.toLowerCase(),
          _descLower: desc.toLowerCase(),
          _keyLower: key.toLowerCase(),
          _searchText: `${label.toLowerCase()} ${desc.toLowerCase()} ${key.toLowerCase()}`
        };
      });
      
      const sectionIndex = new Map();
      preprocessedFields.forEach(field => {
        const section = field.section;
        if (!sectionIndex.has(section)) {
          sectionIndex.set(section, []);
        }
        sectionIndex.get(section).push(field);
      });
      
      const newSearch = (searchTerm, selectedSection) => {
        const start = performance.now();
        
        let filtered;
        if (selectedSection && sectionIndex.has(selectedSection)) {
          filtered = sectionIndex.get(selectedSection);
        } else {
          filtered = preprocessedFields;
        }
        
        if (searchTerm && searchTerm.length >= 1) {
          const searchLower = searchTerm.toLowerCase().trim();
          const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
          
          if (searchWords.length === 1) {
            const searchWord = searchWords[0];
            filtered = filtered.filter(field => {
              if (field._labelLower.startsWith(searchWord) || field._keyLower.startsWith(searchWord)) {
                return true;
              }
              return field._searchText.includes(searchWord);
            });
          } else {
            filtered = filtered.filter(field => {
              return searchWords.every(word => field._searchText.includes(word));
            });
          }
        }
        
        return { results: filtered.length, time: performance.now() - start };
      };
      
      // Run tests
      const tests = [
        { search: '', section: '', desc: 'No filter' },
        { search: 'pro', section: '', desc: 'Search "pro"' },
        { search: 'project', section: '', desc: 'Search "project"' },
        { search: '', section: 'Project Objective', desc: 'Section filter only' },
        { search: 'date', section: 'Project Objective', desc: 'Search "date" in section' },
        { search: 'project objective', section: '', desc: 'Multi-word search' }
      ];
      
      const results = [];
      tests.forEach((test, i) => {
        // Warm up
        oldSearch(test.search, test.section);
        newSearch(test.search, test.section);
        
        // Run multiple iterations for accuracy
        let oldTotal = 0, newTotal = 0;
        const iterations = 100;
        for (let j = 0; j < iterations; j++) {
          oldTotal += oldSearch(test.search, test.section).time;
          newTotal += newSearch(test.search, test.section).time;
        }
        
        const oldAvg = oldTotal / iterations;
        const newAvg = newTotal / iterations;
        const improvement = ((oldAvg - newAvg) / oldAvg * 100).toFixed(1);
        const speedup = (oldAvg / newAvg).toFixed(2);
        
        console.log(`Test ${i + 1}: ${test.desc}`);
        console.log(`  OLD: ${oldAvg.toFixed(3)}ms (avg of ${iterations} runs)`);
        console.log(`  NEW: ${newAvg.toFixed(3)}ms (avg of ${iterations} runs)`);
        console.log(`  ⚡ ${improvement}% faster (${speedup}x speedup)\n`);
        
        results.push({ test: test.desc, old: oldAvg, new: newAvg, improvement: parseFloat(improvement) });
      });
      
      const avgOld = results.reduce((sum, r) => sum + r.old, 0) / results.length;
      const avgNew = results.reduce((sum, r) => sum + r.new, 0) / results.length;
      const avgImprovement = ((avgOld - avgNew) / avgOld * 100).toFixed(1);
      const avgSpeedup = (avgOld / avgNew).toFixed(2);
      
      console.log('📊 Summary');
      console.log('==========');
      console.log(`Average OLD: ${avgOld.toFixed(3)}ms`);
      console.log(`Average NEW: ${avgNew.toFixed(3)}ms`);
      console.log(`⚡ Average improvement: ${avgImprovement}% faster`);
      console.log(`⚡ Average speedup: ${avgSpeedup}x faster`);
      
      return results;
    } catch (error) {
      console.error('❌ Error running performance test:', error);
    }
  };
  
  console.log('✅ Performance test loaded! Run: testFieldSearchPerformance()');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);




