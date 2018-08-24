const Abstract = require('./Abstract');

class AbstractSms extends Abstract {
    _getLangBy(phone) {
        switch (true) {
            case /^\+7|^\+380|^\+375/.test(phone):
                return 'ru';
            default:
                return 'en';
        }
    }
}

module.exports = AbstractSms;
