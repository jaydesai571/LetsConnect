const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const request = require('request');
const config = require('config');

const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { response } = require('express');


// @route  GET api/profile
// @desc   All profiles
// @access Public
router.get('/', async (req,res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name','avatar']);
        res.json(profiles)
    } catch(err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});


// @route  GET api/profile/user/:user_id
// @desc   Get a profile by user id
// @access Public
router.get('/user/:user_id', async (req,res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name','avatar']);
        if(!profile) return res.status(400).json({ msg: 'Profile not found' });
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        if(err.kind == 'Objectd') {
            return res.status(400).json({ msg: 'Profile not found' });
        }
        res.status(500).json('Server Error');
    }
});


// @route  GET api/profile/me
// @desc   Get current users profile
// @access Private
router.get('/me', auth, async (req,res) => {
    try {
         const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar']);
         if(!profile) {
            return res.status(400).json({msg: 'There is no profile for this user'});
         }
         res.json(profile);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
});

// @route  POST api/profile
// @desc   Create/update the profile
// @access Private
router.post('/', [auth, [
    check('status', 'Status is required').not().isEmpty(),
    check('skills', 'Skills is required').not().isEmpty()
] ] , async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ erros: errors.array() });
    }

    const  {
        company,
        website,
        location,
        bio,
        status,
        githubusername,
        skills,
        youtube,
        facebook,
        twitter,
        instagram,
        linkedin
    } = req.body
    const profileFields = {};
    profileFields.user = req.user.id;
    if(company) profileFields.company = company;
    if(website) profileFields.website = website;
    if(location) profileFields.location = location;
    if(bio) profileFields.bio = bio;
    if(status) profileFields.status = status;
    if(githubusername) profileFields.githubusername = githubusername;

    if(skills) {
        profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    // console.log(profileFields.skills);

    profileFields.social = {};
    if(youtube) profileFields.social.youtube = youtube;
    if(twitter) profileFields.social.twitter = twitter;
    if(instagram) profileFields.social.instagram = instagram;
    if(linkedin) profileFields.social.linkedin= linkedin;
    if(facebook) profileFields.social.facebook =facebook;

    try {
        let profile = await Profile.findOne({ user: req.user.id });

        if(profile) {
            profile = await  Profile.findOneAndUpdate({ user: req.user.id }, {$set: profileFields},
                {new: true});
            return res.json(profile);
        }
        profile = new Profile(profileFields);
        await profile.save();   
        res.json(profile);
    }catch(err) {
        console.error(err.message);
        res.status(400).send('Server Eroor');
    }

});


// @route  DELETE api/profile
// @desc   Delete profile, user & posts
// @access Private
router.delete('/', auth, async (req,res) => {
    try {
        //Remove Profile
        await Profile.findOneAndDelete({ user: req.user.id });
        //Remove User
        await User.findOneAndDelete({ _id: req.user.id });
        res.json({ msg: 'User Deleted' });
    } catch(err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

// @route  PUT api/profile/experience
// @desc   Add experience to profile
// @access Private
router.put('/experience', [auth, [
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company is required').not().isEmpty(),
    check('from', 'From Date is required').not().isEmpty()
    ] ], 
    async (req,res) => {
        const errors = validationResult(req);
        if(!errors  .isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, company, location, from ,to , current, description } = req.body;
        const newExp = {
            title, company, location, from ,to , current, description
        }
        try {    
            const profile = await Profile.findOne({ user: req.user.id });
            profile.experience.unshift(newExp);
            await profile.save();
            res.json(profile); 
        } catch(err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
}); 

// @route  DELETE api/profile/experience/:exp_id
// @desc   Delete experience from profile
// @access Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });
        const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
        profile.experience.splice(removeIndex,1); 
        await profile.save(); 
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT api/profile/education
// education to profile
// @access Private
router.put('/education', [auth, [
    check('school', 'School is required').not().isEmpty(),
    check('degree', 'Degree is required').not().isEmpty(),
    check('from', 'From Date is required').not().isEmpty(),
    check('fieldofstudy', 'Field Of Study is required').not().isEmpty(),
    ] ], 
    async (req,res) => {
        const errors = validationResult(req);
        if(!errors  .isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { school, degree, fieldofstudy, from ,to , current, description } = req.body;
        const newEdu = {
            school, degree, fieldofstudy, from ,to , current, description
        }
        try {    
            const profile = await Profile.findOne({ user: req.user.id });
            profile.education.unshift(newEdu);
            await profile.save();
            res.json(profile); 
        } catch(err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
}); 

// @route  DELETE api/profile/education/:edu_id
// @desc   Delete education from profile
// @access Private
router.delete('/education/:edu_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });
        const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
        profile.education.splice(removeIndex,1); 
        await profile.save(); 
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route  GET api/profile/github/:username
// @desc   Get user repo from github
// @access Public
router.get('/github/:username', (req,res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${
                req.params.username
            }/repos?per_page=5&sort=created:asc&client_id=${config.get(
                'githubClientID'
                )}&client_secret=${config.get('githubSecret')}`,
            method: 'GET',
            headers: {'user-agent': 'node.js'}
        };
        // console.log(req.params.username);
        // console.log(config.get('githubClientID'));
        // console.log(config.get('githubSecret'));
        request(options, (error, response, body) => {
            if(error) console.error(error);

            if(response.statusCode !== 200) {
                return res.status(404).json({ msg: 'No Github profile found' });
            }
            res.json(JSON.parse(body));
        });
        
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;