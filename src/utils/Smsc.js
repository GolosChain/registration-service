const request = require('request-promise-native');
const env = require('../data/env');

const SEND_POINT = 'https://smsc.ru/sys/send.php';
const HISTORY_POINT = 'https://smsc.ru/sys/get.php';

class Smsc {
    async send(phone, message) {
        const encodedMessage = encodeURIComponent(message);
        const login = env.GLS_SMS_GATE_LOGIN;
        const pass = env.GLS_SMS_GATE_PASS;
        const sender = env.GLS_SMSC_SENDER_NAME;
        const query = [
            `${SEND_POINT}`,
            `?login=${login}`,
            `&psw=${pass}`,
            `&phones=${phone}`,
            `&mes=${encodedMessage}`,
            `&sender=${sender}`,
            `&fmt=3`,
            `&charset=utf-8`,
        ].join('');
        const result = await request.get(query);

        if (result.error) {
            throw `SMSC send error - [${result.error_code}] ${result.error}`;
        } else {
            return result;
        }
    }

    async getPhonesHistory() {
        const login = env.GLS_SMS_GATE_LOGIN;
        const pass = env.GLS_SMS_GATE_PASS;
        const hour = env.GLS_SMS_VERIFY_EXPIRATION_HOURS + 1;
        const query = [
            `${HISTORY_POINT}`,
            `?get_answers=1`,
            `&login=${login}`,
            `&psw=${pass}`,
            `&hour=${hour}`,
            `&fmt=3`,
            `&charset=utf-8`,
        ].join('');
        const rawHistory = await request.get(query);
        const history = JSON.parse(rawHistory);
        const result = [];

        if (history.error) {
            throw `SMSC history error - [${history.error_code}] ${history.error}`;
        }

        if (!Array.isArray(history)) {
            throw `Invalid SMSC history response - ${rawHistory}`;
        }

        for (let entity of history) {
            if (entity.message === '[CALL]') {
                continue;
            }

            result.push(entity.phone);
        }

        return result;
    }
}

module.exports = Smsc;
