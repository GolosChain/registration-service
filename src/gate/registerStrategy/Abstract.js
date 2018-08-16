class Abstract {
    async handle() {
        throw 'Undefined strategy handler';
    }
}

module.exports = Abstract;
