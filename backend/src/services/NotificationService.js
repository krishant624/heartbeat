// src/services/NotificationService.js
const Notification = require('../models/Notification');
let io;

const initializeSocket = (socketIo) => {
    io = socketIo;
};

const createNotification = async (data) => {
    try {
        const notification = new Notification(data);
        await notification.save();
        if (io) {
            io.to(data.recipient.toString()).emit('notification', notification);
        }
        return notification;
    } catch (error) {
        console.error('Notification error:', error);
        throw error;
    }
};

module.exports = {
    initializeSocket,
    createNotification
};