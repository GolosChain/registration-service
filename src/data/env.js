// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_SMS_VERIFY_EXPIRATION_HOURS: Number(env.GLS_SMS_VERIFY_EXPIRATION_HOURS) || 1,
    GLS_GOOGLE_CAPTCHA_SECRET: env.GLS_GOOGLE_CAPTCHA_SECRET,
    GLS_SMS_RESEND_CODE_TIMEOUT: Number(env.GLS_SMS_RESEND_CODE_TIMEOUT) || 45 * 1000,
    GLS_REGISTRAR_KEY: env.GLS_REGISTRAR_KEY,
    GLS_REGISTRAR_ACCOUNT: env.GLS_REGISTRAR_ACCOUNT,
    GLS_ACCOUNT_DELEGATION_FEE: Number(env.GLS_ACCOUNT_DELEGATION_FEE) || 2.7,
    GLS_FACADE_CONNECT: env.GLS_FACADE_CONNECT,
    GLS_SMS_CONNECT: env.GLS_SMS_CONNECT,
    GLS_IS_REG_ENABLED_ON_START: env.GLS_IS_REG_ENABLED_ON_START || true,
    GLS_DEFAULT_STRATEGY_CHOICER: env.GLS_DEFAULT_STRATEGY_CHOICER || 'legacy',
    GLS_DEFAULT_STRATEGY_CHOICER_DATA: env.GLS_DEFAULT_STRATEGY_CHOICER_DATA || null,
    GLS_CAPTCHA_ON: env.GLS_CAPTCHA_ON || true,
    GLS_MAIL_CONNECT: env.GLS_MAIL_CONNECT,
    GLS_MAIL_FINISH_TEMPLATE_EN: env.GLS_MAIL_FINISH_TEMPLATE_EN,
    GLS_MAIL_FINISH_TEMPLATE_BY: env.GLS_MAIL_FINISH_TEMPLATE_BY,
    GLS_MAIL_FINISH_TEMPLATE_RU: env.GLS_MAIL_FINISH_TEMPLATE_RU,
    GLS_SMS_RESEND_CODE_MAX: Number(env.GLS_SMS_RESEND_CODE_MAX) || 3,
    GLS_TESTING_PASS: env.GLS_TESTING_PASS,
    GLS_CYBERWAY_CONNECT: env.GLS_CYBERWAY_CONNECT,
    GLS_ACCOUNT_NAME_PREFIX: env.GLS_ACCOUNT_NAME_PREFIX || '',
    GLS_CREATOR_NAME: env.GLS_CREATOR_NAME,
    GLS_CREATOR_KEY: env.GLS_CREATOR_KEY,
    GLS_PRISM_CONNECT: env.GLS_PRISM_CONNECT,
};

if (module.exports.GLS_IS_REG_ENABLED_ON_START === 'true') {
    module.exports.GLS_IS_REG_ENABLED_ON_START = true;
}

if (module.exports.GLS_IS_REG_ENABLED_ON_START === 'false') {
    module.exports.GLS_IS_REG_ENABLED_ON_START = false;
}

if (module.exports.GLS_CAPTCHA_ON === 'false') {
    module.exports.GLS_CAPTCHA_ON = false;
}
