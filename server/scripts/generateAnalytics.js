require('dotenv').config();
const mongoose = require('mongoose');
const faker = require('faker');
const moment = require('moment');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Models
const User = require('../models/User');
const Post = require('../models/Post');
const Job = require('../models/Job');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-pro', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Configuration
const config = {
  // Number of days to generate data for
  days: 90,
  
  // Output directory for charts
  outputDir: path.join(__dirname, '..', 'public', 'analytics'),
  
  // Chart dimensions
  chartWidth: 1000,
  chartHeight: 400,
  
  // Colors
  colors: {
    primary: '#0077b5',
    success: '#00a86b',
    warning: '#ffc107',
    danger: '#f44336',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
  },
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

/**
 * Generate random data within a range
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a date range for the past N days
 */
function generateDateRange(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(moment().subtract(i, 'days').startOf('day').toDate());
  }
  return dates;
}

/**
 * Generate user signups data
 */
async function generateUserSignups() {
  try {
    const dates = generateDateRange(config.days);
    const data = [];
    
    // Get actual user signups from the database
    const users = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);    
    
    // Create a map of dates to user counts
    const userMap = new Map(users.map(u => [u._id, u.count]));
    
    // Fill in missing dates with 0 or random data
    for (const date of dates) {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const count = userMap.get(dateStr) || randomInt(0, 10);
      data.push({
        date: dateStr,
        count,
      });
    }
    
    return data;
  } catch (err) {
    console.error('Error generating user signups data:', err);
    return [];
  }
}

/**
 * Generate posts data
 */
async function generatePostsData() {
  try {
    const dates = generateDateRange(config.days);
    const data = [];
    
    // Get actual posts from the database
    const posts = await Post.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          likes: { $sum: { $size: '$likes' } },
          comments: { $sum: { $size: '$comments' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Create a map of dates to post data
    const postMap = new Map();
    for (const post of posts) {
      postMap.set(post._id, {
        count: post.count,
        likes: post.likes,
        comments: post.comments,
      });
    }
    
    // Fill in missing dates with 0 or random data
    for (const date of dates) {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const postData = postMap.get(dateStr) || {
        count: randomInt(0, 20),
        likes: randomInt(0, 100),
        comments: randomInt(0, 30),
      };
      
      data.push({
        date: dateStr,
        posts: postData.count,
        likes: postData.likes,
        comments: postData.comments,
      });
    }
    
    return data;
  } catch (err) {
    console.error('Error generating posts data:', err);
    return [];
  }
}

/**
 * Generate jobs data
 */
async function generateJobsData() {
  try {
    const dates = generateDateRange(config.days);
    const data = [];
    
    // Get actual jobs from the database
    const jobs = await Job.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          applications: { $sum: { $size: '$applications' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Create a map of dates to job data
    const jobMap = new Map();
    for (const job of jobs) {
      jobMap.set(job._id, {
        count: job.count,
        applications: job.applications,
      });
    }
    
    // Group by month
    const months = [];
    for (let i = 2; i >= 0; i--) {
      months.push(moment().subtract(i, 'months').format('YYYY-MM'));
    }
    
    for (const month of months) {
      const jobData = jobMap.get(month) || {
        count: randomInt(5, 50),
        applications: randomInt(10, 200),
      };
      
      data.push({
        month,
        jobs: jobData.count,
        applications: jobData.applications,
        avgApplications: Math.round(jobData.applications / (jobData.count || 1)),
      });
    }
    
    return data;
  } catch (err) {
    console.error('Error generating jobs data:', err);
    return [];
  }
}

/**
 * Generate user engagement data
 */
async function generateEngagementData() {
  try {
    // Get user engagement metrics
    const [activeUsers, topPosts, popularSkills] = await Promise.all([
      // Active users (users with most posts, comments, likes)
      User.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'user',
            as: 'posts',
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            postCount: { $size: '$posts' },
            likeCount: { $sum: '$posts.likes' },
            commentCount: { $sum: { $map: { input: '$posts', as: 'post', in: { $size: '$$post.comments' } } } },
            engagementScore: {
              $add: [
                { $multiply: [{ $size: '$posts' }, 5] },
                { $sum: '$posts.likes' },
                { $sum: { $map: { input: '$posts', as: 'post', in: { $size: '$$post.comments' } } } },
              ],
            },
          },
        },
        { $sort: { engagementScore: -1 } },
        { $limit: 5 },
      ]),
      
      // Top posts (most liked and commented)
      Post.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            content: { $substr: ['$text', 0, 50] },
            author: '$user.name',
            likes: { $size: '$likes' },
            comments: { $size: '$comments' },
            engagement: { $add: [{ $size: '$likes' }, { $size: '$comments' }] },
            createdAt: 1,
          },
        },
        { $sort: { engagement: -1 } },
        { $limit: 5 },
      ]),
      
      // Popular skills
      User.aggregate([
        { $unwind: '$profile.skills' },
        {
          $group: {
            _id: { $toLower: '$profile.skills' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);
    
    return {
      activeUsers,
      topPosts,
      popularSkills,
    };
  } catch (err) {
    console.error('Error generating engagement data:', err);
    return {
      activeUsers: [],
      topPosts: [],
      popularSkills: [],
    };
  }
}

/**
 * Generate a line chart
 */
function generateLineChart(data, title, yLabel, fields, outputFile) {
  const canvas = createCanvas(config.chartWidth, config.chartHeight);
  const ctx = canvas.getContext('2d');
  
  // Set background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Chart area
  const margin = { top: 50, right: 50, bottom: 70, left: 60 };
  const width = canvas.width - margin.left - margin.right;
  const height = canvas.height - margin.top - margin.bottom;
  
  // Find min/max values
  const allValues = [];
  fields.forEach(field => {
    data.forEach(item => {
      if (item[field] !== undefined) {
        allValues.push(item[field]);
      }
    });
  });
  
  const maxValue = Math.max(...allValues, 10);
  const yScale = height / maxValue;
  
  // Draw axes
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + height);
  ctx.lineTo(margin.left + width, margin.top + height);
  ctx.stroke();
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + height);
  ctx.stroke();
  
  // Draw grid lines and y-axis labels
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = margin.top + height - (i * height) / yTicks;
    const value = Math.round((i * maxValue) / yTicks);
    
    // Grid line
    ctx.strokeStyle = '#eeeeee';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + width, y);
    ctx.stroke();
    
    // Y-axis label
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(value.toString(), margin.left - 10, y + 4);
  }
  
  // Draw x-axis labels
  const xStep = width / Math.min(data.length, 30); // Show max 30 labels
  
  data.forEach((item, i) => {
    if (i % Math.ceil(data.length / 30) === 0 || i === data.length - 1) {
      const x = margin.left + i * (width / (data.length - 1));
      
      // X-axis label
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x, margin.top + height + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(item.date || item.month, 0, 0);
      ctx.restore();
      
      // Tick mark
      ctx.strokeStyle = '#dddddd';
      ctx.beginPath();
      ctx.moveTo(x, margin.top + height);
      ctx.lineTo(x, margin.top + height + 5);
      ctx.stroke();
    }
  });
  
  // Draw lines for each field
  const colors = [
    config.colors.primary,
    config.colors.success,
    config.colors.warning,
    config.colors.danger,
    config.colors.info,
  ];
  
  fields.forEach((field, fieldIndex) => {
    ctx.strokeStyle = colors[fieldIndex % colors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((item, i) => {
      const x = margin.left + i * (width / (data.length - 1));
      const y = margin.top + height - (item[field] || 0) * yScale;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point
      ctx.fillStyle = colors[fieldIndex % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.stroke();
  });
  
  // Draw title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, margin.top - 20);
  
  // Draw y-axis label
  ctx.save();
  ctx.translate(margin.left - 40, margin.top + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  
  // Draw legend
  const legendX = margin.left + width - 150;
  let legendY = margin.top - 30;
  
  fields.forEach((field, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, legendY, 10, 10);
    
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(
      field.charAt(0).toUpperCase() + field.slice(1),
      legendX + 15,
      legendY + 8
    );
    
    legendY += 20;
  });
  
  // Save to file
  const out = fs.createWriteStream(outputFile);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  
  return new Promise((resolve, reject) => {
    out.on('finish', () => resolve(outputFile));
    out.on('error', reject);
  });
}

/**
 * Generate a bar chart
 */
function generateBarChart(data, title, xLabel, yLabel, field, outputFile) {
  const canvas = createCanvas(config.chartWidth, config.chartHeight);
  const ctx = canvas.getContext('2d');
  
  // Set background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Chart area
  const margin = { top: 50, right: 50, bottom: 70, left: 80 };
  const width = canvas.width - margin.left - margin.right;
  const height = canvas.height - margin.top - margin.bottom;
  
  // Find max value
  const maxValue = Math.max(...data.map(item => item[field] || 0), 10);
  const yScale = height / maxValue;
  
  // Calculate bar width
  const barWidth = (width / data.length) * 0.8;
  const barSpacing = (width / data.length) * 0.2;
  
  // Draw axes
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + height);
  ctx.lineTo(margin.left + width, margin.top + height);
  ctx.stroke();
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + height);
  ctx.stroke();
  
  // Draw grid lines and y-axis labels
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = margin.top + height - (i * height) / yTicks;
    const value = Math.round((i * maxValue) / yTicks);
    
    // Grid line
    ctx.strokeStyle = '#eeeeee';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + width, y);
    ctx.stroke();
    
    // Y-axis label
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(value.toString(), margin.left - 10, y + 4);
  }
  
  // Draw bars and x-axis labels
  data.forEach((item, i) => {
    const x = margin.left + i * (width / data.length) + barSpacing / 2;
    const barHeight = (item[field] || 0) * yScale;
    
    // Draw bar
    ctx.fillStyle = config.colors.primary;
    ctx.fillRect(x, margin.top + height - barHeight, barWidth, barHeight);
    
    // X-axis label
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // Rotate text if needed
    const label = item._id || item.name || item.month || '';
    if (label.length > 10) {
      ctx.save();
      ctx.translate(x + barWidth / 2, margin.top + height + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(label, x + barWidth / 2, margin.top + height + 15);
    }
    
    // Value on top of bar
    if (barHeight > 20) {
      ctx.fillStyle = '#333333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        item[field].toString(),
        x + barWidth / 2,
        margin.top + height - barHeight - 5
      );
    }
  });
  
  // Draw title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, margin.top - 20);
  
  // Draw y-axis label
  ctx.save();
  ctx.translate(margin.left - 40, margin.top + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  
  // Save to file
  const out = fs.createWriteStream(outputFile);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  
  return new Promise((resolve, reject) => {
    out.on('finish', () => resolve(outputFile));
    out.on('error', reject);
  });
}

/**
 * Generate all analytics data and charts
 */
async function generateAnalytics() {
  try {
    console.log('Generating analytics data...');
    
    // Generate data
    const [userSignups, postsData, jobsData, engagementData] = await Promise.all([
      generateUserSignups(),
      generatePostsData(),
      generateJobsData(),
      generateEngagementData(),
    ]);
    
    console.log('Generating charts...');
    
    // Generate charts
    await Promise.all([
      // User signups over time
      generateLineChart(
        userSignups,
        'User Signups Over Time',
        'Number of Users',
        ['count'],
        path.join(config.outputDir, 'user-signups.png')
      ),
      
      // Posts, likes, and comments over time
      generateLineChart(
        postsData,
        'Posts, Likes & Comments Over Time',
        'Count',
        ['posts', 'likes', 'comments'],
        path.join(config.outputDir, 'posts-activity.png')
      ),
      
      // Jobs and applications by month
      generateBarChart(
        jobsData,
        'Jobs and Applications by Month',
        'Month',
        'Count',
        'jobs',
        path.join(config.outputDir, 'jobs-monthly.png')
      ),
      
      // Popular skills
      generateBarChart(
        engagementData.popularSkills,
        'Top 10 Skills',
        'Skill',
        'Number of Users',
        'count',
        path.join(config.outputDir, 'popular-skills.png')
      ),
    ]);
    
    // Generate HTML report
    const report = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Connect-PRO Analytics Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #0077b5;
          }
          .chart-container {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 5px;
            background: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          }
          .chart {
            margin: 20px 0;
            text-align: center;
          }
          .chart img {
            max-width: 100%;
            height: auto;
            border: 1px solid #eee;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #0077b5;
          }
          .stat-card h3 {
            margin-top: 0;
            color: #333;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #0077b5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .report-title h1 {
            margin: 0;
            color: #0077b5;
          }
          .report-date {
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">
            <h1>Connect-PRO Analytics Report</h1>
            <div class="report-date">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div>
            <img src="https://via.placeholder.com/150x50?text=Connect-PRO" alt="Connect-PRO Logo">
          </div>
        </div>
        
        <h2>Platform Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Users</h3>
            <div class="stat-value">${userSignups.reduce((sum, day) => sum + day.count, 0).toLocaleString()}</div>
            <div>${userSignups[userSignups.length - 1].count} new this week</div>
          </div>
          
          <div class="stat-card">
            <h3>Total Posts</h3>
            <div class="stat-value">${postsData.reduce((sum, day) => sum + day.posts, 0).toLocaleString()}</div>
            <div>${postsData.slice(-7).reduce((sum, day) => sum + day.posts, 0)} this week</div>
          </div>
          
          <div class="stat-card">
            <h3>Total Jobs</h3>
            <div class="stat-value">${jobsData.reduce((sum, month) => sum + month.jobs, 0).toLocaleString()}</div>
            <div>${jobsData[jobsData.length - 1].jobs} new this month</div>
          </div>
          
          <div class="stat-card">
            <h3>Engagement</h3>
            <div class="stat-value">${postsData.reduce((sum, day) => sum + day.likes + day.comments, 0).toLocaleString()}</div>
            <div>Total likes & comments</div>
          </div>
        </div>
        
        <div class="chart-container">
          <h2>User Growth</h2>
          <div class="chart">
            <img src="user-signups.png" alt="User Signups Over Time">
          </div>
        </div>
        
        <div class="chart-container">
          <h2>Content Activity</h2>
          <div class="chart">
            <img src="posts-activity.png" alt="Posts, Likes & Comments Over Time">
          </div>
        </div>
        
        <div class="chart-container">
          <h2>Jobs & Applications</h2>
          <div class="chart">
            <img src="jobs-monthly.png" alt="Jobs and Applications by Month">
          </div>
        </div>
        
        <div class="chart-container">
          <h2>Popular Skills</h2>
          <div class="chart">
            <img src="popular-skills.png" alt="Top 10 Skills">
          </div>
        </div>
        
        <div class="chart-container">
          <h2>Top Active Users</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Posts</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              ${engagementData.activeUsers.map(user => `
                <tr>
                  <td>${user.name}</td>
                  <td>${user.email}</td>
                  <td>${user.postCount}</td>
                  <td>${user.likeCount}</td>
                  <td>${user.commentCount}</td>
                  <td>${user.engagementScore}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="chart-container">
          <h2>Top Performing Posts</h2>
          <table>
            <thead>
              <tr>
                <th>Content</th>
                <th>Author</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${engagementData.topPosts.map(post => `
                <tr>
                  <td>${post.content}...</td>
                  <td>${post.author}</td>
                  <td>${post.likes}</td>
                  <td>${post.comments}</td>
                  <td>${new Date(post.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin: 40px 0; text-align: center; color: #666; font-size: 14px;">
          <p>This report was automatically generated by Connect-PRO Analytics.</p>
          <p>© ${new Date().getFullYear()} Connect-PRO. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
    
    // Save HTML report
    const reportPath = path.join(config.outputDir, 'index.html');
    fs.writeFileSync(reportPath, report);
    
    console.log(`Analytics report generated at: ${reportPath}`);
    console.log('Analytics generation completed!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error generating analytics:', err);
    process.exit(1);
  }
}

// Run the analytics generator
generateAnalytics();
