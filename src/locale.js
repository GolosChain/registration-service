const core = require('gls-core-service');
const Template = core.Template;

// TODO Update locales
module.exports = Template.makeFor({
    sms: {
        activationCode: {
            en: 'test code ${code}',
            ru: 'test code ${code}',
        },
        successVerification: {
            en: 'done code',
            ru: 'done code',
        },
    },
});
