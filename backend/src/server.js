const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initializeSocket: initNotifications, createNotification } = require('./services/NotificationService');
const ActivityService = require('./services/ActivityService');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
   cors: {
       origin: process.env.FRONTEND_URL || 'http://localhost:3000',
       methods: ["GET", "POST"]
   }
});

// Initialize services
initNotifications(io);
ActivityService.initializeSocket(io);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
   .then(() => console.log('MongoDB Connected...'))
   .catch(err => console.log('MongoDB connection error:', err));

try {
    // Routes
    // Routes we know work
    app.use('/api/auth', require('./routes/auth'));
    console.log('Auth routes loaded');

    app.use('/api/password', require('./routes/password'));
    console.log('Password routes loaded');

    app.use('/api/profile', require('./routes/Profile')); 
    console.log('Profile routes loaded');

     // Try loading safety route
    const safetyRoutes = require('./routes/safety');
    console.log('Safety routes required');
    app.use('/api/safety', safetyRoutes);
    console.log('Safety routes loaded');

   // Try loading messages route
   const messagesRoutes = require('./routes/Messages');
   console.log('Messages routes required');
   app.use('/api/messages', messagesRoutes);
   console.log('Messages routes loaded');
    
   // Try loading matches route
   const matchesRoutes = require('./routes/matches');
   console.log('Matches routes required');
   app.use('/api/matches', matchesRoutes);
   console.log('Matches routes loaded');
     
   


    // Test route ***********************************************************
    app.get('/test', (req, res) => {
        res.json({ message: 'Backend is working!' });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ message: 'Something broke!' });
    });

} catch (error) {
    console.error('Error setting up routes:', error);
}

// Socket connection handling
io.on('connection', (socket) => {
   console.log('User connected:', socket.id);

   socket.on('join', (userId) => {
       socket.userId = userId;
       socket.join(userId);
       ActivityService.updateUserActivity(userId, true);
       console.log('User joined room:', userId);
   });

   socket.on('disconnect', () => {
       if (socket.userId) {
           ActivityService.updateUserActivity(socket.userId, false);
       }
       console.log('User disconnected:', socket.id);
   });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
   console.error('Server failed to start:', error);
});