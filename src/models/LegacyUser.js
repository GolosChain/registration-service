const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('LegacyUser', {
    phoneHash: {
        type: String,
        required: true,
        unique: true,
    },
});
