const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        user: {
            type: String,
            required: true,
            minLength: 2,
            maxLength: 100,
        },
        strategy: {
            type: String,
            enum: ['smsToUser', 'smsFromUser', 'email', 'social'],
            required: true,
        },
        registered: {
            type: Boolean,
            default: false,
        },
        publicKeys: {
            owner: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
            active: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
            posting: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
            memo: {
                type: String,
                minLength: 53,
                maxLength: 53,
            },
        },
        block: {
            type: Number,
        },

        // Strategy - smsToUser, smsFromUser
        // Phone section
        phone: {
            type: String,
            minLength: 6,
            maxLength: 100,
        },
        phoneHash: {
            type: String,
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
        smsCodeResendCount: {
            type: Number,
            default: 0,
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

        // Tests
        isTestingSystem: {
            type: Boolean,
            default: false,
        },
    },
    {
        index: [
            // Search and identify
            {
                fields: {
                    user: 1,
                },
            },
            // Strategy - smsFromUser
            {
                fields: {
                    strategy: 1,
                    phone: 1,
                },
                options: {
                    sparse: true,
                },
            },
            // Strategy - smsFromUser
            {
                fields: {
                    strategy: 1,
                    phoneHash: 1,
                },
                options: {
                    sparse: true,
                },
            },
        ],
    }
);
