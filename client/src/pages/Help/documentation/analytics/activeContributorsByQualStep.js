// Active Contributors by Qualification Step Documentation
export default {
  title: 'Active Contributors by Qualification Step',
  sections: [
    {
      heading: 'Overview',
      content: `
        <p>The Active Contributors by Qualification Step page tracks contributors at each qualification step to understand progression and identify bottlenecks in the qualification process.</p>
        <p><strong>Purpose:</strong> Monitor contributor progress through qualification steps, identify where contributors get stuck, measure step completion rates, and optimize the qualification process.</p>
        <p><strong>When to use:</strong> Use this page to analyze qualification step performance, identify bottlenecks, track contributor progression, and understand where contributors are in the qualification process.</p>
        <p><strong>Default View:</strong> The page displays a table or visualization showing contributors distributed across qualification steps.</p>
      `
    },
    {
      heading: 'Qualification Step Analysis',
      content: `
        <p>The page shows contributors at each qualification step:</p>
        <ul>
          <li><strong>Step Distribution</strong>:
            <ul>
              <li>Number of contributors at each step</li>
              <li>Step names and numbers</li>
              <li>Visual representation of distribution</li>
            </ul>
          </li>
          <li><strong>Progression Metrics</strong>:
            <ul>
              <li>Contributors who completed each step</li>
              <li>Contributors currently at each step</li>
              <li>Step completion rates</li>
            </ul>
          </li>
          <li><strong>Bottleneck Identification</strong>:
            <ul>
              <li>Steps with many contributors (bottlenecks)</li>
              <li>Steps with slow progression</li>
              <li>Steps needing attention</li>
            </ul>
          </li>
        </ul>
      `
    },
    {
      heading: 'Filters and Options',
      content: `
        <p>The page supports filtering (if available):</p>
        <ul>
          <li><strong>Project Filter</strong> - Filter by specific projects</li>
          <li><strong>Objective Filter</strong> - Filter by project objectives</li>
          <li><strong>Step Filter</strong> - Focus on specific qualification steps</li>
          <li><strong>GPC Filter</strong> - Apply your personalized content filtering preferences</li>
        </ul>
        <p><strong>Refresh Button:</strong> Click to reload all data with the latest information.</p>
      `
    },
    {
      heading: 'Understanding Step Progression',
      content: `
        <p>Analyze how contributors progress through steps:</p>
        <ul>
          <li><strong>Step Sequence</strong>:
            <ul>
              <li>Steps are typically numbered (Step 1, Step 2, etc.)</li>
              <li>Contributors must complete steps in order</li>
              <li>Each step represents a qualification milestone</li>
            </ul>
          </li>
          <li><strong>Completion Rates</strong>:
            <ul>
              <li>Percentage of contributors completing each step</li>
              <li>Compare rates across steps</li>
              <li>Identify problematic steps</li>
            </ul>
          </li>
          <li><strong>Time at Step</strong>:
            <ul>
              <li>How long contributors spend at each step</li>
              <li>Long times indicate bottlenecks</li>
              <li>Use to prioritize improvements</li>
            </ul>
          </li>
        </ul>
      `
    },
    {
      heading: 'Identifying Bottlenecks',
      content: `
        <p>Use the data to identify bottlenecks:</p>
        <ul>
          <li><strong>High Contributor Count</strong>:
            <ul>
              <li>Steps with many contributors indicate bottlenecks</li>
              <li>Contributors are getting stuck at these steps</li>
            </ul>
          </li>
          <li><strong>Low Completion Rate</strong>:
            <ul>
              <li>Steps with low completion rates need attention</li>
              <li>May indicate step difficulty or clarity issues</li>
            </ul>
          </li>
          <li><strong>Slow Progression</strong>:
            <ul>
              <li>Steps where contributors spend too much time</li>
              <li>May need process optimization</li>
            </ul>
          </li>
        </ul>
      `
    },
    {
      heading: 'Tips and Best Practices',
      content: `
        <ul>
          <li><strong>Monitor Step Distribution</strong> - Regularly check where contributors are in the process</li>
          <li><strong>Focus on Bottlenecks</strong> - Prioritize steps with many contributors</li>
          <li><strong>Compare Steps</strong> - Compare completion rates across steps</li>
          <li><strong>Use GPC Filter</strong> - Enable GPC filter to focus on your projects</li>
          <li><strong>Track Improvements</strong> - Monitor how step performance changes over time</li>
          <li><strong>Optimize Problem Steps</strong> - Improve steps with low completion rates</li>
        </ul>
      `
    }
  ]
};

