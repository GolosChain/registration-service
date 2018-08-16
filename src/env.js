// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_PHONE_VERIFY_TIMEOUT: env.GLS_PHONE_VERIFY_TIMEOUT,
    GLS_CLEANER_INTERVAL_HOURS: env.GLS_CLEANER_INTERVAL_HOURS || 1,
    GLS_CLEANER_SMS_VERIFY_EXPIRATION_HOURS: env.GLS_CLEANER_SMS_VERIFY_EXPIRATION_HOURS || 3,
};
