const core = require('gls-core-service');
const Template = core.Template;

module.exports = Template.makeFor({
    sms: {
        activationCode: {
            en: '',
            ru: '',
        },
        successVerification: {
            en: '',
            ru: '',
        },
    },
});
