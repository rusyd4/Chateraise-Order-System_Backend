const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const branchRoutes = require('./routes/branchRoutes');

app.use(cors());
app.use(express.json());

// Serve uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/branch', branchRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
