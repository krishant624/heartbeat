// src/routes/matches.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const NotificationService = require('../services/NotificationService');
const { getRecommendations } = require('../services/RecommendationService'); // Destructured import

// Calculate compatibility score
const calculateCompatibilityScore = (user1, user2) => {
    let score = 0;
    
    // Interest matching
    const commonInterests = user1.profile.interests.filter(interest => 
        user2.profile.interests.includes(interest)
    );
    score += (commonInterests.length * 10);

    // Age preference matching
    const ageMatch = user2.profile.age >= user1.preferences.minAge && 
                    user2.profile.age <= user1.preferences.maxAge;
    if (ageMatch) score += 20;

    // Location proximity (closer = higher score)
    if (user1.location?.coordinates && user2.location?.coordinates) {
        const distance = calculateDistance(
            user1.location.coordinates,
            user2.location.coordinates
        );
        score += Math.max(0, 30 - (distance / 1000)); // Higher score for closer users
    }

    return Math.min(100, score); // Cap at 100
};

const calculateDistance = (coords1, coords2) => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
};

// Get potential matches with enhanced matching
router.get('/potential', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const matches = await Match.find({ 'users': user._id });
        const matchedUserIds = matches.flatMap(match => match.users);

        const query = {
            _id: { 
                $ne: user._id,
                $nin: matchedUserIds
            },
            'profile.gender': { $in: user.preferences.gender },
            'profile.age': {
                $gte: user.preferences.minAge,
                $lte: user.preferences.maxAge
            },
            'profile.interests': {
                $in: user.profile.interests // At least one common interest
            }
        };

        if (user.location?.coordinates) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: user.location.coordinates
                    },
                    $maxDistance: user.preferences.maxDistance * 1000
                }
            };
        }

        let potentialMatches = await User.find(query)
            .select('-password')
            .limit(50);

        // Calculate compatibility scores and sort
        potentialMatches = potentialMatches.map(match => ({
            ...match.toObject(),
            compatibilityScore: calculateCompatibilityScore(user, match)
        }))
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, 20);

        res.json(potentialMatches);
    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Advanced filtering
router.post('/filter', auth, async (req, res) => {
    try {
        const {
            minAge,
            maxAge,
            interests,
            maxDistance,
            onlineOnly,
            verifiedOnly
        } = req.body;

        const user = await User.findById(req.user.id);
        const matches = await Match.find({ 'users': user._id });
        const matchedUserIds = matches.flatMap(match => match.users);

        const query = {
            _id: { 
                $ne: user._id,
                $nin: matchedUserIds
            }
        };

        if (minAge || maxAge) {
            query['profile.age'] = {};
            if (minAge) query['profile.age'].$gte = minAge;
            if (maxAge) query['profile.age'].$lte = maxAge;
        }

        if (interests?.length) {
            query['profile.interests'] = { $in: interests };
        }

        if (onlineOnly) {
            query.isOnline = true;
        }

        if (verifiedOnly) {
            query['verificationStatus.isVerified'] = true;
        }

        if (user.location?.coordinates && maxDistance) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: user.location.coordinates
                    },
                    $maxDistance: maxDistance * 1000
                }
            };
        }

        const filteredMatches = await User.find(query)
            .select('-password')
            .limit(20);

        res.json(filteredMatches);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// src/routes/matches.js - Add these new routes

// Get personalized recommendations
// src/routes/matches.js
router.get('/recommendations', auth, async (req, res) => {
    try {
        // Change this line to use destructured import
        const { getRecommendations } = require('../services/RecommendationService');
        const recommendations = await getRecommendations(req.user.id);
        const user = await User.findById(req.user.id);

        // Rest of your code...

        // Use recommendations to find better matches
        const potentialMatches = await User.aggregate([
            {
                $geoNear: {
                    near: user.location,
                    distanceField: "distance",
                    maxDistance: user.preferences.maxDistance * 1000,
                    spherical: true
                }
            },
            {
                $match: {
                    _id: { $ne: user._id },
                    'profile.age': { 
                        $gte: recommendations.ageRanges[0] - 2,
                        $lte: recommendations.ageRanges[0] + 2
                    },
                    'profile.interests': {
                        $in: Object.keys(recommendations.commonInterests)
                            .sort((a, b) => recommendations.commonInterests[b] - recommendations.commonInterests[a])
                            .slice(0, 5)
                    }
                }
            },
            {
                $addFields: {
                    matchScore: {
                        $sum: [
                            { $multiply: ["$profile.interests", 10] },
                            { $divide: [1000, { $add: ["$distance", 1] }] }
                        ]
                    }
                }
            },
            { $sort: { matchScore: -1 } },
            { $limit: 20 }
        ]);

        res.json(potentialMatches);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Match statistics
router.get('/statistics', auth, async (req, res) => {
    try {
        const matches = await Match.find({
            users: req.user.id
        });

        const stats = {
            totalMatches: matches.length,
            successfulMatches: matches.filter(m => m.status === 'matched').length,
            pendingMatches: matches.filter(m => m.status === 'pending').length,
            matchRate: (matches.filter(m => m.status === 'matched').length / matches.length) * 100,
            recentMatches: await Match.find({
                users: req.user.id,
                createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
            }).count()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Daily match suggestions
router.get('/daily-suggestions', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const suggestions = await User.aggregate([
            {
                $match: {
                    _id: { $ne: user._id },
                    'profile.age': {
                        $gte: user.preferences.minAge,
                        $lte: user.preferences.maxAge
                    },
                    'verificationStatus.isVerified': true,
                    lastActive: { $gte: today }
                }
            },
            { $sample: { size: 5 } }
        ]);

        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Match compatibility score
router.get('/compatibility/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const otherUser = await User.findById(req.params.userId);

        const compatibilityScore = calculateDetailedCompatibility(user, otherUser);
        res.json(compatibilityScore);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Other existing routes...
const calculateDetailedCompatibility = (user1, user2) => {
    const scores = {
        interests: 0,
        age: 0,
        location: 0,
        activity: 0,
        verification: 0,
        total: 0
    };

    // Interest compatibility (30%)
    const commonInterests = user1.profile.interests.filter(i => 
        user2.profile.interests.includes(i)
    );
    scores.interests = (commonInterests.length / Math.max(user1.profile.interests.length, user2.profile.interests.length)) * 30;

    // Age compatibility (20%)
    const ageDiff = Math.abs(user1.profile.age - user2.profile.age);
    scores.age = Math.max(0, 20 - (ageDiff * 2));

    // Location compatibility (20%)
    if (user1.location?.coordinates && user2.location?.coordinates) {
        const distance = calculateDistance(user1.location.coordinates, user2.location.coordinates);
        scores.location = Math.max(0, 20 - (distance / 1000));
    }

    // Activity patterns (15%)
    const lastActiveDiff = Math.abs(user1.lastActive - user2.lastActive) / (1000 * 60 * 60);
    scores.activity = Math.max(0, 15 - lastActiveDiff);

    // Verification status (15%)
    if (user1.verificationStatus.isVerified && user2.verificationStatus.isVerified) {
        scores.verification = 15;
    }

    scores.total = Object.values(scores).reduce((a, b) => a + b, 0);
    return scores;
};

module.exports = router;