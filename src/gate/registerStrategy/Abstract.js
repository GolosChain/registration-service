class Abstract {
    async register() {
        throw 'Undefined strategy register';
    }

    async verify() {
        throw 'Undefined strategy verify';
    }
}

module.exports = Abstract;
