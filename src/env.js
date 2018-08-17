// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_PHONE_VERIFY_TIMEOUT: env.GLS_PHONE_VERIFY_TIMEOUT,
    GLS_SMS_VERIFY_EXPIRATION_HOURS: env.GLS_SMS_VERIFY_EXPIRATION_HOURS || 1,
    GLS_GOOGLE_CAPTCHA_SECRET: env.GLS_GOOGLE_CAPTCHA_SECRET
};
