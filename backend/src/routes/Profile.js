const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get my profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update profile
router.put('/', auth, async (req, res) => {
    try {
        const {
            name,
            age,
            gender,
            bio,
            interests,
            location,
            preferences
        } = req.body;

        const profileFields = {};
        if (name) profileFields.name = name;
        
        profileFields.profile = {};
        if (age) profileFields.profile.age = age;
        if (gender) profileFields.profile.gender = gender;
        if (bio) profileFields.profile.bio = bio;
        if (interests) profileFields.profile.interests = interests.split(',').map(interest => interest.trim());
        
        if (location) {
            profileFields.location = {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            };
        }
        
        if (preferences) {
            profileFields.preferences = {
                minAge: preferences.minAge || 18,
                maxAge: preferences.maxAge || 100,
                gender: preferences.gender || ['male', 'female'],
                maxDistance: preferences.maxDistance || 50
            };
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload profile photo
router.post('/photo', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Note: We'll implement actual photo upload later
        const photoUrl = req.body.photoUrl;
        
        if (!user.profile.photos) {
            user.profile.photos = [];
        }
        
        user.profile.photos.push(photoUrl);
        await user.save();

        res.json(user.profile.photos);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update preferences
router.put('/preferences', auth, async (req, res) => {
    try {
        const { minAge, maxAge, gender, maxDistance } = req.body;

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.preferences = {
            minAge: minAge || user.preferences.minAge,
            maxAge: maxAge || user.preferences.maxAge,
            gender: gender || user.preferences.gender,
            maxDistance: maxDistance || user.preferences.maxDistance
        };

        await user.save();

        res.json(user.preferences);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;