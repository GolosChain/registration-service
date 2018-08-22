const core = require('gls-core-service');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        user: {
            type: String,
            required: true,
            minLength: 2,
            maxLength: 100,
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
            minLength: 3,
            maxLength: 100,
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
            minLength: 6,
            maxLength: 200,
        },
        isMailVerified: {
            type: Boolean,
            default: false,
        },

        // TODO Another sections for another strategies
    },
    {
        index: [
            // Strategy - smsFromUser
            {
                fields: {
                    registrationStrategy: 1,
                    phone: 1,
                },
                options: {
                    sparse: true,
                },
            },
            // TODO Another indexes for another strategies
        ],
    }
);
