# REGISTRATION-SERVICE

**REGISTRATION-SERVICE** является сервисом регистрации для [golos.io](https://golos.io) и приложений.

Сервис предоставляет 4 типа стратегии регистрации, определяемые динамически:

-   `smsFromUser` - Пользователь отправляет СМС на указанный номер для верификации, самый безопасный, но наименее удобный для пользователя способ.
-   `smsToUser` - Мы присылаем пользователю СМС с кодом, который он присылает нам, удобный и безопасный, но расточительный способ верификации.
-   `mail` - Верификация по почте _(не реализовано в данной версии)_.
-   `social` - Верификация через соцсети _(не реализовано в данной версии)_.

Также предоставляются способы динамического выбора стратегии для пользователя, определяемые на сервере, в том числе для A-B тестирования:

-   `legacy` - Старый способ регистрации, пользователь всегда получит стратегию `smsFromUser`.
-   `randomSmsStrategy` - Способ регистрации когда пользователи получают стратегии `smsFromUser` и `smsToUser`,
    при этом выбор происходит поочередно - первый пользователь получает одну стратегию, второй другую, третий снова первую и т.д.
    В результате выходит распределение 50/50, но без выделения кагорт пользователей и какого-либо анализа при выборе.
-   `directStrategy` - Жесткое указание стратегии для пользователя, которая будет использоваться им при регистрации.
    Дополнительно нужно отправить сопутствующие данные в формате `{strategy: <string(name)>}`, указывающие на имя стратегии.

При старте сервис выберет тип как `legacy`, однако это можно поменять в настройках `env`.

API JSON-RPC:

```

// Step api

getState:                 // Получить текущий стейт регистрации для пользователя. Один из двух параметров должен присутствовать (user -- приоритетный)
    user <string>         // Имя пользователя.
    phone <string>         // Телефон пользователя.

firstStep:                // Первый шаг регистрации.
    captcha <string>      // Ключ Google reCaptcha.
    user <string>         // Имя пользователя.
    phone <string>        // Номер телефона.
    mail <string>         // Адрес почты.
    testingPass <string>  // Пароль, отключающий проверку на капчу
                          // и помечающий телефон как тестовый.

verify:                   // Второй шаг регистрации, верификация аккаунта (кроме стратегии smsFromUser).
    user <string>         // Имя пользователя.
    phone <string>        // Телефон пользователя.
    code <number/string>  // СМС-код (для стратегий smsFromUser, smsToUser).

addUsername:              // Второй шаг регистрации, верификация аккаунта (кроме стратегии smsFromUser).
    user <string>         // Имя пользователя.
    phone <string>        // Телефон пользователя.

toBlockChain:         // Третий шаг регистрации, запись в блокчейн.
    user <string>     // Имя пользователя.
    owner <string>    // Ключ аккаунта (главный ключ).
    active <string>   // Ключ аккаунта (активный ключ).
    posting <string>  // Ключ аккаунта (постинг ключ).
    memo <string>     // Ключ аккаунта (мемо ключ).

// Strategy-specific api

changePhone:              // Смена номера телефона (для стратегий smsFromUser, smsToUser).
    user <string>         // Имя пользователя.
    phone <string>        // Номер телефона.
    captcha <string>      // Ключ Google reCaptcha (для стратегии smsToUser).
    testingPass <string>  // Пароль, отключающий проверку на капчу

resendSmsCode:      // Переотравка кода подтверждения (для стратегии smsToUser).
    user <string>   // Имя пользователя.

subscribeOnSmsGet:  // Подписка на факт получения СМС от юзера (для стратегии smsFromUser).
    user <string>   // Имя пользователя.
    phone <string>  // Номер телефона.

// Sms receiver api

incomingSms:               // Обработка входящей смс от пользователя
    phone <string>         // Номер телефона

recentSmsList:             // Обработка всех ранее полученных смс (для проверки на случай ошибок)
    list: <Array<Object>>  // Массив объектов смс
        phone <string>     // Номер телефона

// Control api

getStrategyChoicer:              // Возвращает способ выбора стратегии для регистрации и сопутствующие данные
    <empty>

setStrategyChoicer:              // Устанавливает способ выбора стратегии для регистрации
    choicer: <string>('legacy')  // Тип способа выбора стратегии, детально смотри в начале документации
       [
         randomSmsStrategy       // Поочередно выбирается 'smsFromUser' и 'smsToUser' стратегия
       | directStrategy          // Жестко устанавливается указанная в data стратегия
       | legacy                  // Устанавливается стратегия 'smsFromUser'
       ]
    data: <null|Object>(null)    // Сопутствующие данные для способа выбора стратегии

enableRegistration:          // Разрешает регистрацию для пользователей
    <empty>

disableRegistration:         // Запрещает регистрацию для пользователей
    <empty>

isRegistrationEnabled:       // Проверяет разрешена ли регистрация для пользователей
    <empty>

deleteAccount:            // Удаление аккаунта
    targetUser <string>   // Пользователь для удаления
    testingPass <string>  // Пароль системы тестирования для удаления тестовых аккаунтов
```

Возможные переменные окружения `ENV`:

-   `GLS_DAY_START` - время начала нового дня в часах относительно UTC.  
    Дефолтное значение - `3` (день начинается в 00:00 по Москве)

-   `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

-   `GLS_METRICS_HOST` _(обязательно)_ - адрес хоста для метрик StatsD.  
    Дефолтное значение при запуске без докера - `127.0.0.1`

-   `GLS_METRICS_PORT` _(обязательно)_ - адрес порта для метрик StatsD.  
    Дефолтное значение при запуске без докера - `8125`

-   `GLS_CONNECT_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `0.0.0.0`

-   `GLS_CONNECT_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `3000`

-   `GLS_SMS_VERIFY_EXPIRATION_HOURS` - время, за которое необходимо пройти верификацию по СМС, иначе аккаунт будет отправлен в архив и имя вместе с номером телефона будут освобождены.  
    Дефолтное значение - `1` (измеряется в часах)

-   `GLS_GOOGLE_CAPTCHA_SECRET` _(обязательно)_ - секретный ключ Google для reCaptcha.

-   `GLS_SMS_RESEND_CODE_TIMEOUT` - время, через которое можно повторно запросить отправку СМС-кода.  
    Дефолтное значение - `45000` (измеряется в миллисекундах)

-   `GLS_SMS_RESEND_CODE_MAX` - максимальное количество попыток переотправки смс кода.
    Дефолтное значение - `3`

-   `GLS_REGISTRAR_KEY` _(обязательно)_ - активный ключ регистратора аккаунтов.

-   `GLS_REGISTRAR_ACCOUNT` _(обязательно)_ - имя аккаунта регистратора аккаунтов.

-   `GLS_FACADE_CONNECT` _(обязательно)_ - адрес подключения к микросервису фасаду.

-   `GLS_SMS_CONNECT` _(обязательно)_ - адрес подключения к микросервису sms-сообщений.

-   `GLS_IS_REG_ENABLED_ON_START` - флаг управления разрешением регистрации при запуске сервиса, необходимо выставить в `false` если после запуска сервиса он должен запрещать регистрацию и ждать явного вызова метода управления, который её включит.  
    Дефолтное значение - `true`, после запуска сервис сразу разрешает пользователям регистрацию.

-   `GLS_DEFAULT_STRATEGY_CHOICER` - указывает на стартовый способ выбора стратегии регистрации, о возможных способах смотри в начале документации.  
    Дефолтное значение - `legacy`

-   `GLS_DEFAULT_STRATEGY_CHOICER_DATA` - дефолтные данные для параметра выше. Пустое значение будет воспринято как `null`, любое другое будет распарсено как `JSON`.  
    Дефолтное значение - `` _(распарсится как `null`)_.

-   `GLS_CAPTCHA_ON` - флаг указывающий на необходимость фильтрации входящих запросов на регистрацию через капчу.  
    Дефолтное значение - `true`

-   `GLS_MAIL_CONNECT` _(обязательно)_ - адрес подключения к микросервису рассылки почты.

-   `GLS_MAIL_FINISH_TEMPLATE_RU` _(обязательно)_ - идентификатор шаблона письма регистрации с русской локалью.

-   `GLS_MAIL_FINISH_TEMPLATE_BY` _(обязательно)_ - идентификатор шаблона письма регистрации с беларусской локалью.

-   `GLS_MAIL_FINISH_TEMPLATE_EN` _(обязательно)_ - идентификатор шаблона письма регистрации с английской локалью.

-   `GLS_TESTING_PASS` - пароль для запросов, убирающий проверку капчи и упрощающий механизм верификации.

-   `GLS_MONGO_EXTERNAL_HOST` - адрес подключения к базе данных из внешних сервисов (например - метрики).
    Дефолтное значение при запуске в докере - `127.0.0.1`

-   `GLS_MONGO_EXTERNAL_PORT` - порт подключения к базе данных из внешних сервисов (например - метрики).
    Дефолтное значение при запуске в докере - `27017`

-   `GLS_CYBERWAY_CONNECT` - URL для подключения к блокчейну

Для запуска сервиса достаточно вызвать команду `docker-compose up` в корне проекта, предварительно указав
необходимые `ENV` переменные.
