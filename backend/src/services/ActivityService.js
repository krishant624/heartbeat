const User = require('../models/User');

let io;

const initializeSocket = (socketIo) => {
    io = socketIo;
};

const updateUserActivity = async (userId, isOnline = true) => {
    try {
        await User.findByIdAndUpdate(userId, {
            lastActive: new Date(),
            isOnline
        });

        if (io) {
            io.emit('userActivity', { userId, isOnline });
        }
    } catch (error) {
        console.error('Activity update error:', error);
    }
};

module.exports = {
    initializeSocket,
    updateUserActivity
};