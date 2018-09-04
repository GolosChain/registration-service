# REGISTRATION-SERVICE

**REGISTRATION-SERVICE** является сервисом регистрации для [golos.io](https://golos.io) и приложений.

Сервис предоставляет 4 типа регистрации, определяемые динамически:
 
 - `smsFromUser` - Пользователь отправляет СМС на указанный номер для верификации, самый безопасный, но наименее удобный для пользователя способ.
 - `smsToUser` - Мы присылаем пользователю СМС с кодом, который он присылает нам, удобный и безопасный, но расточительный способ верификации.
 - `mail` - Верификация по почте *(не реализовано в этой версии)*.
 - `social` - Верификация через *соцсети (не реализовано в этой версии)*.
 
API JSON-RPC:

 ```
 firstStep:            // Первый шаг регистрации.
     captcha <string>  // Ключ Google reCaptcha.
     user <string>     // Имя пользователя.
     phone <string>    // Номер телефона.
     mail <string>     // Адрес почты.
     
 verify:               // Второй шаг регистрации, верификация аккаунта (кроме стратегии smsFromUser).
     user <string>     // Имя пользователя.
     code <number>     // СМС-код (для стратегий smsFromUser, smsToUser).
     
 toBlockChain:         // Третий шаг регистрации, запись в блокчейн.
     user <string>     // Имя пользователя.
     owner <string>    // Ключ аккаунта (главный ключ).
     active <string>   // Ключ аккаунта (активный ключ).
     posting <string>  // Ключ аккаунта (постинг ключ).
     memo <string>     // Ключ аккаунта (мемо ключ).
     
 changePhone:          // Смена номера телефона (для стратегий smsFromUser, smsToUser).
     user <string>     // Имя пользователя.
     phone <string>    // Номер телефона.
     
 resendSmsCode:        // Переотравка кода подтверждения (для стратегии smsToUser).
     user <string>     // Имя пользователя.
     phone <string>    // Номер телефона.
     
 subscribeOnSmsGet:    // Подписка на факт получения СМС от юзера (для стратегии smsFromUser).
     user <string>     // Имя пользователя.
     phone <string>    // Номер телефона. 
 ```

API SMS-GATE:

 ```
 <any_request>:
     AccountSid <string>  // Секрет для валидации входящих соединений.
     From <string>        // Номер телефона (TWILIO).
     phone <string>       // Номер телефона (SMSC). 
 ```

Возможные переменные окружения `ENV`:

  - `GLS_DAY_START` - время начала нового дня в часах относительно UTC.  
   Дефолтное значение - `3` (день начинается в 00:00 по Москве).
  
  - `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
   Дефолтное значение - `mongodb://mongo/admin`
  
  - `GLS_METRICS_HOST` *(обязательно)* - адрес хоста для метрик StatsD.   
   Дефолтное значение при запуске без докера - `127.0.0.1`
  
  - `GLS_METRICS_PORT` *(обязательно)* - адрес порта для метрик StatsD.  
   Дефолтное значение при запуске без докера - `8125`
  
  - `GLS_GATE_HOST` *(обязательно)* - адрес, который будет использован для входящих подключений связи микросервисов.  
   Дефолтное значение при запуске без докера - `127.0.0.1`
  
  - `GLS_GATE_PORT` *(обязательно)* - адрес порта, который будет использован для входящих подключений связи микросервисов.  
   Дефолтное значение при запуске без докера - `8080`
  
  - `GLS_SMS_VERIFY_EXPIRATION_HOURS` - время, за которое необходимо пройти верификацию по СМС, иначе аккаунт будет отправлен в архив и имя вместе с номером телефона будут освобождены.   
   Дефолтное значение - `1` (измеряется в часах)
  
  - `GLS_GOOGLE_CAPTCHA_SECRET` *(обязательно)* - секретный ключ Google для reCaptcha.
  
  - `GLS_SMS_RESEND_CODE_TIMEOUT` - время, через которое можно повторно запросить отправку СМС-кода.  
   Дефолтное значени - `45000` (измеряется в миллисекундах)
  
  - `GLS_REGISTRAR_KEY` *(обязательно)* - активный ключ регистратора аккаунтов.
  
  - `GLS_REGISTRAR_ACCOUNT` *(обязательно)* - имя аккаунта регистратора аккаунтов.
  
  - `GLS_ACCOUNT_DELEGATION_FEE` - количество длелегируемой силы голоса при реристрации.  
   Дефолтное значение - `2.7`
  
  - `GLS_SMS_GATE_HOST` *(обязательно)* - адрес, который будет использован для входящих соединений на SMS-GATE.
  
  - `GLS_SMS_GATE_PORT` *(обязательно)* - адрес порта, который будет использован для входящих соединений на SMS-GATE.
  
  - `GLS_SMS_GATE_LOGIN` *(обязательно)* - логин для отправки СМС.
  
  - `GLS_SMS_GATE_PASS` *(обязательно)* - пароль для отправки СМС.
                                                                                                                              
  - `GLS_SMS_GATE_SECRET_SID` *(обязательно)* - секрет, используемый для определения валидных входящих соединений на SMS-GATE.
  
  - `GLS_TWILIO_SECRET` *(обязательно)* - секрет, используемый для авторизации в TWILIO.
  
  - `GLS_TWILIO_PHONE_FROM` *(обязательно)* - номер отправителя для TWILIO.
  
  - `GLS_SMSC_SENDER_NAME` - имя отправителя для SMSC.  
   Дефолтное значение - `Golos.io`
   
  - `GLS_FACADE_CONNECT` *(обязательно)* - адрес подключения к микросервису фасаду. 
 
Для запуска сервиса достаточно вызвать команду `docker-compose up` в корне проекта, предварительно указав
необходимые `ENV` переменные. 
