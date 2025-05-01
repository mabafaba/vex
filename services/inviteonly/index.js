const express = require('express');
const router = express.Router();
const controller = require('./invite.controller');
const { authenticate } = require('../../authorizations');

// All routes except redeem require authentication
router.post('/create', authenticate, controller.createInvite);
router.post('/redeem', controller.redeemInvite); // No auth: for registration
router.get('/mine', authenticate, controller.listInvites);

module.exports = { router };
