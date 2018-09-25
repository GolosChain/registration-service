const core = require('gls-core-service');
const Template = core.Template;

// prettier-ignore
module.exports = Template.makeFor({
    sms: {
        activationCode: {
            ru: 'Ваш код подтверждения Golos.io ${code}',
            en: 'Your Golos.io verification code is ${code}',
        },
        successVerification: {
            ru: 'Спасибо, ваш номер подтвержден. Продолжите регистрацию.',
            en: 'Thank you, your number is successfully confirmed. Please, continue the registration.',
        },
    },
    mail: {
        subject: {
            ru: 'Добро пожаловать на Golos.io!',
            en: '', // TODO add translate
        },
    },
});
