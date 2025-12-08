// Crowd Dashboard Documentation
export default {
  title: 'Crowd Dashboard',
  sections: [
    {
      heading: 'Overview',
      content: `
        <p>The Crowd Dashboard provides comprehensive analytics about your contributor community, including demographics, preferences, and performance metrics.</p>
        <p><strong>Purpose:</strong> This dashboard helps you understand your contributor base, identify trends, and make data-driven decisions about contributor engagement and project assignments.</p>
      `
    },
    {
      heading: 'Overview Tab',
      content: `
        <p>The Overview tab shows high-level statistics and visualizations:</p>
        <ul>
          <li><strong>Total Contributors</strong> - Total number of contributors in the system</li>
          <li><strong>Active Contributors</strong> - Contributors who have been active recently</li>
          <li><strong>Contributor Distribution</strong> - Charts showing distribution by various dimensions:
            <ul>
              <li>By country/region</li>
              <li>By language</li>
              <li>By project assignment</li>
              <li>By status</li>
            </ul>
          </li>
          <li><strong>Engagement Metrics</strong> - Activity levels, participation rates, and engagement trends</li>
        </ul>
        <p>Click on any chart segment to drill down into more detailed views (if available).</p>
      `
    },
    {
      heading: 'Demographic Segmentation Tab',
      content: `
        <p>Analyze contributors by various demographic characteristics:</p>
        <ul>
          <li><strong>Geographic Location</strong> - View contributors by country, state, or region
            <ul>
              <li>Use the country filter to focus on specific regions</li>
              <li>State/province breakdowns are available for selected countries</li>
            </ul>
          </li>
          <li><strong>Language Preferences</strong> - Distribution of contributors by their language capabilities</li>
          <li><strong>Demographic Characteristics</strong> - Age groups, education levels, and other demographic data</li>
          <li><strong>Engagement Patterns</strong> - Activity patterns, peak times, and participation trends</li>
        </ul>
        <p><strong>Filters Available:</strong></p>
        <ul>
          <li>Country/Region filter</li>
          <li>Language filter</li>
          <li>Date range selector</li>
          <li>Project filter</li>
          <li>GPC filter toggle</li>
        </ul>
      `
    },
    {
      heading: 'User Preferences Tab',
      content: `
        <p>View and analyze contributor preferences including:</p>
        <ul>
          <li><strong>Content Filtering Preferences</strong> - Contributors' GPC filter settings and preferences</li>
          <li><strong>Notification Settings</strong> - How contributors prefer to receive communications</li>
          <li><strong>Communication Preferences</strong> - Preferred communication channels and frequencies</li>
          <li><strong>Project Preferences</strong> - Types of projects contributors are interested in</li>
        </ul>
        <p>This information helps you tailor communications and project assignments to contributor preferences.</p>
      `
    },
    {
      heading: 'Performance Features',
      content: `
        <p>The Crowd Dashboard includes performance optimizations:</p>
        <ul>
          <li><strong>Request Caching</strong> - Frequently accessed data is cached to reduce load times</li>
          <li><strong>Pagination</strong> - Large datasets are paginated to improve performance</li>
          <li><strong>Debouncing</strong> - Rapid refresh clicks are debounced to prevent excessive API calls</li>
          <li><strong>Performance Monitoring</strong> - Real-time performance metrics are displayed to help identify bottlenecks</li>
        </ul>
        <p>If you experience slow loading, check the performance monitor widget for details.</p>
      `
    },
    {
      heading: 'Filters and Options',
      content: `
        <p>The dashboard supports various filtering options:</p>
        <ul>
          <li><strong>Country Filter</strong> - Filter contributors by country/region</li>
          <li><strong>Language Filter</strong> - Filter by language capabilities</li>
          <li><strong>Project Filter</strong> - Filter by project assignment</li>
          <li><strong>Status Filter</strong> - Filter by contributor status</li>
          <li><strong>Date Range</strong> - Filter by activity date or registration date</li>
          <li><strong>GPC Filter</strong> - Apply your personalized content filtering preferences
            <ul>
              <li>Toggle on/off using the GPC Filter button</li>
              <li>When enabled, shows only data for your selected accounts/projects</li>
              <li>When disabled, shows all data</li>
            </ul>
          </li>
        </ul>
      `
    },
    {
      heading: 'Refresh and Updates',
      content: `
        <p><strong>Refresh Button:</strong> Click the refresh button to update all widgets with the latest data from Salesforce.</p>
        <p><strong>Auto-refresh:</strong> Some widgets may auto-refresh periodically. Check individual widget settings for auto-refresh intervals.</p>
        <p><strong>Debounced Refresh:</strong> Rapid refresh clicks are debounced to prevent excessive API calls and improve performance.</p>
        <p><strong>GPC Filter:</strong> Use the GPC Filter toggle to apply or override your content filtering preferences. When enabled, only data matching your selected accounts and projects will be displayed.</p>
      `
    },
    {
      heading: 'Performance Monitor',
      content: `
        <p>The dashboard includes a performance monitor widget that displays:</p>
        <ul>
          <li><strong>Widget Load Times</strong> - How long each widget takes to load</li>
          <li><strong>Cache Statistics</strong> - Cache hit/miss rates</li>
          <li><strong>Request Counts</strong> - Number of API requests made</li>
          <li><strong>Performance Metrics</strong> - Overall dashboard performance indicators</li>
        </ul>
        <p>Use this information to identify slow-loading widgets and optimize performance.</p>
      `
    },
    {
      heading: 'Using the Dashboard',
      content: `
        <p><strong>To view crowd analytics:</strong></p>
        <ol>
          <li>Navigate to <strong>Dashboards > Crowd Dashboard</strong></li>
          <li>Select a tab (Overview, Demographic Segmentation, or User Preferences)</li>
          <li>Apply filters as needed</li>
          <li>Review the metrics and visualizations</li>
          <li>Click on chart elements to drill down (if available)</li>
          <li>Use the refresh button to update with latest data</li>
        </ol>
      `
    },
    {
      heading: 'Tips and Best Practices',
      content: `
        <ul>
          <li><strong>Use Filters</strong> - Use filters to focus on specific demographics or projects</li>
          <li><strong>Monitor Performance</strong> - Check the performance monitor to identify slow widgets</li>
          <li><strong>Review Trends</strong> - Regularly review demographic trends to understand your contributor base</li>
          <li><strong>Track Engagement</strong> - Monitor engagement metrics to identify active contributors</li>
          <li><strong>Use GPC Filter</strong> - Enable GPC filter to focus on your projects</li>
          <li><strong>Export Data</strong> - Export data for detailed analysis</li>
          <li><strong>Refresh Regularly</strong> - Refresh to get the latest contributor data</li>
        </ul>
      `
    }
  ]
};

