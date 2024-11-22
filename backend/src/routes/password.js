const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Request password reset
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');

        // Save token to database
        const passwordReset = new PasswordReset({
            user: user._id,
            token: token
        });
        await passwordReset.save();

        // Send email
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Error sending reset email' });
    }
});

// Reset password with token
router.post('/reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Find valid reset token
        const passwordReset = await PasswordReset.findOne({ 
            token,
            expiresAt: { $gt: new Date() }
        }).populate('user');

        if (!passwordReset) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password
        await User.findByIdAndUpdate(passwordReset.user._id, {
            password: hashedPassword
        });

        // Delete used token
        await PasswordReset.deleteOne({ _id: passwordReset._id });

        // Send confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: passwordReset.user.email,
            subject: 'Password Reset Successful',
            html: `
                <h1>Password Reset Successful</h1>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
});

module.exports = router;