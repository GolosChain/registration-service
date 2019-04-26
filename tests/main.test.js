const {
    callWrapper,
    getState,
    deleteAccount,
    firstStep,
    verify,
    setUsername,
    toBlockChain,
    Keygen,
    generateNewUsername,
} = require('./utils');

// TODO: before testing add testingPass from .env
const testingPass = '';

test('main test', async done => {
    const phone = '+700010000000';
    const user = await generateNewUsername();
    const verbose = true;
    let state;

    await deleteAccount(
        {
            targetPhone: phone,
            testingPass,
        },
        verbose
    );

    state = await getState({ phone }, verbose);

    expect(state.currentState).toBe('firstStep');

    const { code } = await firstStep(
        {
            phone,
            testingPass,
        },
        verbose
    );

    state = await getState({ phone }, verbose);
    expect(state.currentState).toBe('verify');

    await verify(
        {
            phone,
            code,
        },
        verbose
    );

    state = await getState({ phone }, verbose);
    expect(state.currentState).toBe('setUsername');

    await setUsername(
        {
            user,
            phone,
        },
        verbose
    );

    const { currentState: currentStatePhone } = await getState({ phone }, verbose);
    const { currentState: currentStateUser } = await getState({ user }, verbose);

    expect(currentStateUser).toEqual(currentStatePhone);
    expect(currentStatePhone).toBe('toBlockChain');

    const master = await Keygen.generateMasterKeys();

    const { userId, username } = await toBlockChain(
        {
            user,
            active: master.publicKeys.active.replace('EOS', 'GLS'),
            owner: master.publicKeys.owner.replace('EOS', 'GLS'),
        },
        verbose
    );
    expect(username).toBe(user);
    expect(userId).toBeDefined();

    state = await getState({ phone }, verbose);
    expect(state.currentState).toBe('registered');
    done();
}, 30000);

test('tests already existed user rejection', async done => {
    expect.assertions(1);
    const user = 'destroyer2k';

    const { currentState } = await getState({ user });

    expect(currentState).toBe('registered');
    done();
});

test('tests already existed user rejection manual', async done => {
    // FIRST REGISTER USER
    const phone = '+700000001000';
    const user = await generateNewUsername();

    await deleteAccount({
        targetPhone: phone,
        testingPass,
    });

    const { code } = await firstStep({
        phone,
        testingPass,
    });

    await verify({
        phone,
        code,
    });

    await setUsername({
        user,
        phone,
    });

    const master = await Keygen.generateMasterKeys();

    await toBlockChain({
        user,
        active: master.publicKeys.active.replace('EOS', 'GLS'),
        owner: master.publicKeys.owner.replace('EOS', 'GLS'),
    });

    const { currentState } = await getState({ phone });
    expect(currentState).toBe('registered');

    try {
        const result = await firstStep({ testingPass, phone });
        expect(result).toBeUndefined();
    } catch (e) {
        expect(e).toEqual({
            code: 400,
            currentState: 'registered',
            message: 'Invalid step taken',
        });
    }
    done();
});

test('invalid params firstStep', async done => {
    expect.assertions(1);

    try {
        const resp = await callWrapper('firstStep', {});
        expect(resp).toBeUndefined();
    } catch (e) {
        expect(e).toEqual({
            code: 400,
            message: "data should have required property 'phone'",
        });
    }
    done();
});

test('invalid params verify', async done => {
    expect.assertions(1);

    try {
        const resp = await callWrapper('verify', {});
        expect(resp).toBeUndefined();
    } catch (e) {
        expect(e).toEqual({
            code: 400,
            message: "data should have required property 'code'",
        });
    }
    done();
});

test('invalid params setUsername', async done => {
    expect.assertions(1);

    try {
        const resp = await callWrapper('setUsername', {});
        expect(resp).toBeUndefined();
    } catch (e) {
        expect(e).toEqual({
            code: 400,
            message: "data should have required property 'user'",
        });
    }
    done();
});
