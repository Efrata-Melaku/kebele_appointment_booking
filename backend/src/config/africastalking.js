/**
 * Africa's Talking SDK — single shared instance for SMS.
 * @see https://github.com/AfricasTalkingLtd/africastalking-node
 */
const AfricasTalking = require('africastalking');
const env = require('./env');

let smsClient = null;
let initialized = false;

function isConfigured() {
  return Boolean(env.AT_API_KEY && env.AT_USERNAME);
}

function getSmsClient() {
  if (!isConfigured()) {
    return null;
  }
  if (!initialized) {
    const at = AfricasTalking({
      apiKey: env.AT_API_KEY,
      username: env.AT_USERNAME,
    });
    smsClient = at.SMS;
    initialized = true;
  }
  return smsClient;
}

module.exports = {
  isConfigured,
  getSmsClient,
};
