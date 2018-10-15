const hash = require('golos-js/lib/auth/ecc').hash;

const STATIC_SALT = 'GOLOS';

class Phone {
    static plainHash(phone) {
        return hash.sha256(phone, 'hex');
    }

    static saltedHash(phone) {
        return hash.sha256(`${STATIC_SALT}${phone}`, 'hex');
    }

    static comparePlain(phone, hash) {
        return this.plainHash(phone) === hash;
    }

    static compareSalted(phone, hash) {
        return this.saltedHash(phone) === hash;
    }

    static maskBody(phone) {
        const segments = /^(...)(.*)(..)$/g.exec(phone).slice(1, 4);

        segments[1].replace(/./g, '*');

        return segments.join('');
    }
}

module.exports = Phone;
