const Invite = require('./invite.model');
const crypto = require('crypto');

// Create a new invite
exports.createInvite = async (req, res) => {
  try {
    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    const invite = new Invite({
      code,
      createdBy: req.user.id,
      expiresAt
    });
    await invite.save();
    res.json({ code, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Redeem an invite
exports.redeemInvite = async (req, res) => {
  try {
    const { code } = req.body;
    const invite = await Invite.findOne({ code, used: false, expiresAt: { $gt: new Date() } });
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }
    invite.used = true;
    invite.usedBy = req.user ? req.user.id : null;
    await invite.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List invites created by the user
exports.listInvites = async (req, res) => {
  try {
    const invites = await Invite.find({ createdBy: req.user.id });
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
