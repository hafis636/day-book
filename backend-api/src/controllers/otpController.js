const { confirmUserContact, validateOtp } = require('../services/otpService');

const confirmUser = async (req, res) => {
  const contact = typeof req.query.contact === 'string' ? req.query.contact.trim() : '';
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^\d{10}$/.test(contact);

  if (!isEmail && !isPhone) {
    return res.status(400).json({ error: 'Enter a valid email address or 10-digit phone number' });
  }

  try {
    const exists = await confirmUserContact(contact);
    return res.json({ exists });
  } catch (error) {
    console.error('Failed to confirm OTP user:', error);
    return res.status(500).json({ error: 'Failed to verify phone or email' });
  }
};

const validateUserOtp = async (req, res, next) => {
  const contact = typeof req.body?.contact === 'string' ? req.body.contact.trim() : '';
  const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^\d{10}$/.test(contact);

  if ((!isEmail && !isPhone) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Enter a valid email or phone number and a 6-digit OTP' });
  }

  try {
    const result = await validateOtp(contact, otp);
    if (!result.valid) {
      return res.json({ valid: false });
    }
    req.authenticatedUserId = result.userId;
    return next();
  } catch (error) {
    console.error('Failed to validate OTP:', error);
    return res.status(500).json({ error: 'Failed to validate OTP' });
  }
};

module.exports = { confirmUser, validateUserOtp };
