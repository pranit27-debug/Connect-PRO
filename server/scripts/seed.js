require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Job = require('../models/Job');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// Connect to database
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

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Job.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    console.log('Database cleared');
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
};

// Create sample users
const createUsers = async () => {
  try {
    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
      isEmailVerified: true,
      profile: {
        headline: 'System Administrator',
        location: 'San Francisco, CA',
        about: 'I am the system administrator for Connect-PRO',
        skills: ['Node.js', 'MongoDB', 'React', 'AWS'],
      },
    });

    // Create recruiter user
    const recruiter = new User({
      name: 'Recruiter One',
      email: 'recruiter@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'recruiter',
      isEmailVerified: true,
      profile: {
        headline: 'Talent Acquisition Specialist',
        company: 'Tech Corp Inc.',
        location: 'New York, NY',
        about: 'Helping great talent find their dream jobs',
        skills: ['Recruiting', 'Talent Acquisition', 'HR', 'Interviewing'],
      },
    });

    // Create regular users
    const users = [];
    const names = [
      'John Doe',
      'Jane Smith',
      'Alex Johnson',
      'Sarah Williams',
      'Michael Brown',
      'Emily Davis',
      'David Wilson',
      'Emma Garcia',
    ];

    for (let i = 0; i < 8; i++) {
      const user = new User({
        name: names[i],
        email: `user${i + 1}@example.com`,
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        isEmailVerified: true,
        profile: {
          headline: `${i % 2 === 0 ? 'Software Engineer' : 'UX/UI Designer'} at ${['Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Netflix', 'Tesla', 'Airbnb'][i]}`,
          location: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Chicago, IL', 'Denver, CO', 'Portland, OR'][i],
          about: `I am a passionate ${i % 2 === 0 ? 'software engineer' : 'UX/UI designer'} with a love for creating amazing products.`,
          skills: i % 2 === 0 
            ? ['JavaScript', 'React', 'Node.js', 'MongoDB', 'AWS']
            : ['UI/UX', 'Figma', 'Sketch', 'User Research', 'Prototyping'],
          experience: [
            {
              title: i % 2 === 0 ? 'Senior Software Engineer' : 'Senior UX Designer',
              company: ['Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Netflix', 'Tesla', 'Airbnb'][i],
              location: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Chicago, IL', 'Denver, CO', 'Portland, OR'][i],
              from: new Date(2020, 0, 1),
              to: null,
              current: true,
              description: 'Working on exciting projects and building amazing products.'
            },
            {
              title: i % 2 === 0 ? 'Software Engineer' : 'UX Designer',
              company: ['Microsoft', 'Apple', 'Amazon', 'Facebook', 'Netflix', 'Tesla', 'Airbnb', 'Google'][i % 8],
              location: ['New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Chicago, IL', 'Denver, CO', 'Portland, OR', 'San Francisco, CA'][i],
              from: new Date(2018, 0, 1),
              to: new Date(2019, 11, 31),
              current: false,
              description: 'Contributed to various projects and improved user experience.'
            }
          ],
          education: [
            {
              school: ['MIT', 'Stanford', 'Harvard', 'UC Berkeley', 'CMU', 'University of Washington', 'UT Austin', 'University of Michigan'][i % 8],
              degree: i % 2 === 0 ? 'Master of Computer Science' : 'Bachelor of Design',
              fieldOfStudy: i % 2 === 0 ? 'Computer Science' : 'Human-Computer Interaction',
              from: new Date(2014, 0, 1),
              to: new Date(2018, 0, 1),
              current: false,
              description: 'Graduated with honors.'
            }
          ]
        },
      });
      users.push(user);
    }

    // Save all users
    const savedUsers = await User.insertMany([admin, recruiter, ...users]);
    console.log(`${savedUsers.length} users created`);
    return savedUsers;
  } catch (err) {
    console.error('Error creating users:', err);
    process.exit(1);
  }
};

// Create sample posts
const createPosts = async (users) => {
  try {
    const posts = [
      {
        user: users[0]._id,
        text: 'Excited to announce that we are hiring for multiple positions at our company! Check out our careers page for more details.',
        likes: [users[1]._id, users[2]._id],
        comments: [
          {
            user: users[1]._id,
            text: 'Great opportunity! Just applied.',
            likes: [users[0]._id],
          },
        ],
      },
      {
        user: users[3]._id,
        text: 'Just completed a challenging project using React and Node.js. Learned so much along the way! #webdevelopment #react #nodejs',
        likes: [users[0]._id, users[2]._id, users[4]._id],
        comments: [
          {
            user: users[2]._id,
            text: 'Impressive work! Would love to hear more about your approach.',
          },
        ],
      },
      {
        user: users[5]._id,
        text: 'Looking for recommendations on the best tools for remote team collaboration. What are you all using?',
        likes: [users[1]._id, users[3]._id, users[7]._id],
        comments: [
          {
            user: users[1]._id,
            text: 'We use Slack for communication and Notion for documentation. Works great for us!',
          },
          {
            user: users[7]._id,
            text: 'Check out Miro for collaborative whiteboarding. It's been a game-changer for our team.',
          },
        ],
      },
    ];

    const createdPosts = await Post.insertMany(posts);
    console.log(`${createdPosts.length} posts created`);
    return createdPosts;
  } catch (err) {
    console.error('Error creating posts:', err);
    process.exit(1);
  }
};

// Create sample jobs
const createJobs = async (recruiter) => {
  try {
    const jobs = [
      {
        title: 'Senior Frontend Developer',
        company: 'Tech Corp Inc.',
        location: 'San Francisco, CA',
        type: 'Full-time',
        salary: { min: 120000, max: 180000, currency: 'USD' },
        description: 'We are looking for an experienced Frontend Developer to join our team...',
        requirements: [
          '5+ years of experience with React',
          'Strong JavaScript/TypeScript skills',
          'Experience with state management (Redux, Context API)',
          'Familiarity with modern frontend build pipelines and tools',
        ],
        responsibilities: [
          'Develop new user-facing features',
          'Build reusable components and front-end libraries',
          'Optimize components for maximum performance',
          'Collaborate with the design team to implement UI/UX improvements',
        ],
        skills: ['React', 'JavaScript', 'TypeScript', 'Redux', 'HTML/CSS'],
        postedBy: recruiter._id,
        status: 'open',
      },
      {
        title: 'UX/UI Designer',
        company: 'Design Hub',
        location: 'Remote',
        type: 'Contract',
        salary: { min: 80, max: 120, currency: 'USD', period: 'hour' },
        description: 'We are seeking a talented UX/UI Designer to create amazing user experiences...',
        requirements: [
          '3+ years of UX/UI design experience',
          'Proficiency in Figma or Sketch',
          'Strong portfolio showcasing your work',
          'Experience with user research and testing',
        ],
        responsibilities: [
          'Create user flows, wireframes, and prototypes',
          'Design beautiful and functional user interfaces',
          'Conduct user research and usability testing',
          'Collaborate with developers to implement designs',
        ],
        skills: ['UI/UX', 'Figma', 'Sketch', 'User Research', 'Prototyping'],
        postedBy: recruiter._id,
        status: 'open',
      },
      {
        title: 'Full Stack Developer',
        company: 'Startup X',
        location: 'New York, NY',
        type: 'Full-time',
        salary: { min: 100000, max: 160000, currency: 'USD' },
        description: 'Join our fast-growing startup as a Full Stack Developer...',
        requirements: [
          '3+ years of full-stack development experience',
          'Proficiency in JavaScript/TypeScript',
          'Experience with React and Node.js',
          'Knowledge of databases (MongoDB, PostgreSQL)',
        ],
        responsibilities: [
          'Develop and maintain web applications',
          'Write clean, maintainable, and efficient code',
          'Collaborate with cross-functional teams',
          'Participate in code reviews',
        ],
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'PostgreSQL'],
        postedBy: recruiter._id,
        status: 'open',
      },
    ];

    const createdJobs = await Job.insertMany(jobs);
    console.log(`${createdJobs.length} jobs created`);
    return createdJobs;
  } catch (err) {
    console.error('Error creating jobs:', err);
    process.exit(1);
  }
};

// Create sample conversations and messages
const createConversations = async (users) => {
  try {
    // Create a group conversation
    const groupConversation = new Conversation({
      participants: [users[0]._id, users[1]._id, users[2]._id],
      isGroup: true,
      groupInfo: {
        name: 'Project Discussion',
        admin: users[0]._id,
      },
    });

    // Create direct conversations
    const conversation1 = new Conversation({
      participants: [users[0]._id, users[3]._id],
      isGroup: false,
    });

    const conversation2 = new Conversation({
      participants: [users[0]._id, users[4]._id],
      isGroup: false,
    });

    const savedConversations = await Conversation.insertMany([
      groupConversation,
      conversation1,
      conversation2,
    ]);

    console.log(`${savedConversations.length} conversations created`);

    // Create messages
    const messages = [
      {
        conversation: savedConversations[0]._id,
        sender: users[0]._id,
        content: 'Hello everyone! Welcome to our project discussion group.',
      },
      {
        conversation: savedConversations[0]._id,
        sender: users[1]._id,
        content: 'Thanks for creating the group! Looking forward to working together.',
      },
      {
        conversation: savedConversations[0]._id,
        sender: users[2]._id,
        content: 'Same here! When are we having our first meeting?',
      },
      {
        conversation: savedConversations[1]._id,
        sender: users[0]._id,
        content: 'Hi there! How are you doing?',
      },
      {
        conversation: savedConversations[1]._id,
        sender: users[3]._id,
        content: "I'm doing great, thanks for asking! How about you?",
      },
      {
        conversation: savedConversations[2]._id,
        sender: users[4]._id,
        content: 'Hey! Do you have a minute to discuss the project?',
      },
    ];

    const createdMessages = await Message.insertMany(messages);
    console.log(`${createdMessages.length} messages created`);

    // Update last message in conversations
    for (let i = 0; i < savedConversations.length; i++) {
      const conversation = savedConversations[i];
      const lastMessage = createdMessages
        .filter((msg) => msg.conversation.toString() === conversation._id.toString())
        .sort((a, b) => b.createdAt - a.createdAt)[0];

      if (lastMessage) {
        conversation.lastMessage = lastMessage._id;
        await conversation.save();
      }
    }

    return { conversations: savedConversations, messages: createdMessages };
  } catch (err) {
    console.error('Error creating conversations and messages:', err);
    process.exit(1);
  }
};

// Create sample notifications
const createNotifications = async (users) => {
  try {
    const notifications = [
      {
        recipient: users[0]._id,
        sender: users[1]._id,
        type: 'connection_request',
        message: `${users[1].name} sent you a connection request`,
        link: `/profile/${users[1]._id}`,
      },
      {
        recipient: users[0]._id,
        sender: users[2]._id,
        type: 'post_like',
        message: `${users[2].name} liked your post`,
        link: '/feed',
      },
      {
        recipient: users[0]._id,
        sender: users[3]._id,
        type: 'post_comment',
        message: `${users[3].name} commented on your post`,
        link: '/feed',
      },
      {
        recipient: users[0]._id,
        type: 'job_recommendation',
        message: 'New jobs that match your profile',
        link: '/jobs',
      },
    ];

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`${createdNotifications.length} notifications created`);
    return createdNotifications;
  } catch (err) {
    console.error('Error creating notifications:', err);
    process.exit(1);
  }
};

// Main function to run the seeder
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data
    await clearDatabase();
    
    // Create users
    const users = await createUsers();
    
    // Create posts
    await createPosts(users);
    
    // Create jobs (posted by the recruiter)
    const recruiter = users.find(user => user.role === 'recruiter');
    await createJobs(recruiter);
    
    // Create conversations and messages
    await createConversations(users);
    
    // Create notifications
    await createNotifications(users);
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();
