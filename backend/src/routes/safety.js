const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserReport = require('../models/UserReport');
const UserBlock = require('../models/UserBlock');
const User = require('../models/User');

// Report a user
router.post('/report', auth, async (req, res) => {
    try {
        const { userId, reason, description } = req.body;

        // Check if user exists
        const reportedUser = await User.findById(userId);
        if (!reportedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already reported
        const existingReport = await UserReport.findOne({
            reporter: req.user.id,
            reported: userId,
            status: { $in: ['pending', 'reviewed'] }
        });

        if (existingReport) {
            return res.status(400).json({ message: 'You have already reported this user' });
        }

        const report = new UserReport({
            reporter: req.user.id,
            reported: userId,
            reason,
            description
        });

        await report.save();
        res.json({ message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Block a user
router.post('/block', auth, async (req, res) => {
    try {
        const { userId, reason } = req.body;

        // Check if already blocked
        const existingBlock = await UserBlock.findOne({
            blocker: req.user.id,
            blocked: userId
        });

        if (existingBlock) {
            return res.status(400).json({ message: 'User is already blocked' });
        }

        const block = new UserBlock({
            blocker: req.user.id,
            blocked: userId,
            reason
        });

        await block.save();

        // Remove any matches between users
        await Match.deleteMany({
            users: { $all: [req.user.id, userId] }
        });

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get blocked users
router.get('/blocks', auth, async (req, res) => {
    try {
        const blocks = await UserBlock.find({ blocker: req.user.id })
            .populate('blocked', 'name profile.photos');
        res.json(blocks);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Unblock a user
router.delete('/block/:userId', auth, async (req, res) => {
    try {
        await UserBlock.findOneAndDelete({
            blocker: req.user.id,
            blocked: req.params.userId
        });
        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

      module.exports = router;