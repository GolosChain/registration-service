const core = require('gls-core-service');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        user: {
            type: String,
            required: true,
        },
        registrationStrategy: {
            type: String,
            enum: ['smsToUser', 'smsFromUser', 'email', 'social'],
            required: true,
        },

        // Strategy - smsToUser, smsFromUser
        // Phone section
        phone: {
            type: String,
            required: true,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },

        // Strategy - smsToUser
        smsCode: {
            type: String,
        },
        smsCodeDate: {
            type: Date,
        },

        // Strategy - all (used for notify)
        // Mail section
        mail: {
            type: String,
            required: true,
        },
        isMailVerified: {
            type: Boolean,
            default: false,
        },

        // TODO Another sections for another strategies
    },
    {
        index: [
            // Cleaner for - smsToUser, smsFromUser
            {
                fields: {
                    registrationStrategy: 1,
                    isPhoneVerified: 1,
                },
            },
            // TODO Another indexes for another strategies
        ],
    }
);
