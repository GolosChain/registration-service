const core = require('gls-core-service');
const Template = core.Template;

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
});
