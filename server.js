require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/departments',  require('./routes/departments'));
app.use('/api/students',     require('./routes/students'));
app.use('/api/faculty',      require('./routes/faculty'));
app.use('/api/courses',      require('./routes/courses'));
app.use('/api/classes',      require('./routes/classes'));
app.use('/api/enrollments',  require('./routes/enrollments'));
app.use('/api/attendance',   require('./routes/attendance'));
app.use('/api/exams',        require('./routes/exams'));
app.use('/api/results',      require('./routes/results'));
app.use('/api/analytics',    require('./routes/analytics'));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 College Management System running at http://localhost:${PORT}`);
});
