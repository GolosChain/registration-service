const core = require('gls-core-service');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        user: {
            type: String,
            required: true,
        },

        // Phone section
        phone: {
            type: String,
            required: true,
        },
        phoneVerifyType: {
            type: String,
            enum: ['ingoing', 'outgoing'],
        },
        isPhoneVerifySend: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },

        // Mail section
        mail: {
            type: String,
            required: true,
        },
        isMailVerifySend: {
            type: Boolean,
            default: false,
        },
        isMailVerifyRetrySend: {
            type: Boolean,
            default: false,
        },
        isMailVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        index: [
            // Cleaner
            {
                fields: {
                    isPhoneVerified: 1,
                },
            },
        ],
    }
);
