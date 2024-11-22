const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Match = require('../models/Match');

// Get messages for a specific match
router.get('/:matchId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ match: req.params.matchId })
            .populate('sender', 'name profile')
            .sort('-createdAt');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Send a message
router.post('/', auth, async (req, res) => {
    try {
        const { matchId, content } = req.body;

        // Verify match exists and user is part of it
        const match = await Match.findOne({
            _id: matchId,
            users: req.user.id,
            status: 'matched'
        });

        if (!match) {
            return res.status(400).json({ message: 'Match not found or not active' });
        }

        const message = new Message({
            match: matchId,
            sender: req.user.id,
            content
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name profile');

        res.json(populatedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark messages as read
router.put('/read/:matchId', auth, async (req, res) => {
    try {
        await Message.updateMany(
            {
                match: req.params.matchId,
                sender: { $ne: req.user.id },
                read: false
            },
            { read: true }
        );
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;