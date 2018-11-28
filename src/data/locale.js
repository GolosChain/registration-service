const core = require('gls-core-service');
const Template = core.utils.Template;

// prettier-ignore
module.exports = Template.makeFor({
    sms: {
        activationCode: {
            ru: 'Ваш код подтверждения Golos.io ${code}',
            by: 'Ваш код подтверждения Golos.io ${code}',
            en: 'Your Golos.io verification code is ${code}',
        },
        successVerification: {
            ru: 'Спасибо, ваш номер подтвержден. Продолжите регистрацию.',
            by: 'Спасибо, ваш номер подтвержден. Продолжите регистрацию.',
            en: 'Thank you, your number is successfully confirmed. Please, continue the registration.',
        },
    },
    mail: {
        subject: {
            ru: 'Добро пожаловать на Golos.io!',
            by: 'Добро пожаловать на Golos.io!',
            en: 'Welcome to Golos.io!',
        },
    },
});
