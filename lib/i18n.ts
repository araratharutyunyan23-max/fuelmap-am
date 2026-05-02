// Single source of truth for UI strings. Two locales: Russian (default) and
// Armenian. To add a string: add a key to BOTH `ru` and `hy` blocks below.
// Tone: informal "ты" in Russian, equivalent informal address in Armenian.

export type Locale = 'ru' | 'hy';

const dict = {
  ru: {
    // ------- Common
    'common.back': 'Назад',
    'common.cancel': 'Отмена',
    'common.save': 'Сохранить',
    'common.close': 'Закрыть',
    'common.loading': 'Загрузка…',
    'common.send': 'Отправить',
    'common.confirm': 'Подтвердить',
    'common.retry': 'Повторить',
    'common.km': 'км',
    'common.amd': '֏',

    // ------- Bottom nav
    'nav.map': 'Карта',
    'nav.list': 'Список',
    'nav.history': 'История',
    'nav.profile': 'Профиль',

    // ------- Onboarding
    'onboarding.tagline': 'Все заправки Армении в одном приложении',
    'onboarding.feature.map': 'Карта 250+ АЗС по всей стране',
    'onboarding.feature.cheaper': 'Сравнивай цены и экономь до 30 ֏/литр',
    'onboarding.feature.alerts': 'Уведомления о падении цен',
    'onboarding.cta.register': 'Регистрация',
    'onboarding.cta.login': 'Войти',
    'onboarding.cta.guest': 'Войти как гость',

    // ------- Login
    'login.title': 'Вход',
    'login.subtitle': 'Введите email и пароль для входа.',
    'login.email': 'Email',
    'login.password': 'Пароль',
    'login.passwordPlaceholder': 'Минимум 6 символов',
    'login.submit': 'Войти',
    'login.submitting': 'Входим…',
    'login.noAccount': 'Нет аккаунта?',
    'login.goToRegister': 'Зарегистрироваться',
    'login.invalidCredentials': 'Неверный email или пароль',

    // ------- Register
    'register.title': 'Регистрация',
    'register.subtitle': 'Создай аккаунт, чтобы сообщать цены и получать карму.',
    'register.name': 'Имя',
    'register.namePlaceholder': 'Как тебя зовут?',
    'register.confirmPassword': 'Подтверди пароль',
    'register.confirmPlaceholder': 'Повтори пароль',
    'register.passwordsDontMatch': 'Пароли не совпадают',
    'register.submit': 'Зарегистрироваться',
    'register.submitting': 'Создаём аккаунт…',
    'register.haveAccount': 'Уже есть аккаунт?',
    'register.goToLogin': 'Войти',

    // ------- Map
    'map.searchPlaceholder': 'Ереван…',
    'map.brands.title': 'Сети',
    'map.brands.reset': 'Сбросить',
    'map.sort.distance': 'Ближе',
    'map.sort.price': 'Дешевле',
    'map.bottomSheet.count': '{n} заправок рядом',
    'map.location.notSupported': 'Геолокация не поддерживается этим браузером',
    'map.location.denied': 'Доступ к геолокации запрещён',
    'map.location.failed': 'Не удалось определить позицию',
    'map.location.timeout': 'Время ожидания истекло',

    // ------- List
    'list.priceFromAvg': '{diff} ֏ от средней',
    'list.cheapest': 'Самый дешёвый',

    // ------- Cheapest
    'cheapest.title': 'Сегодня дешевле всего',
    'cheapest.subtitle': 'Обновлено {time}',
    'cheapest.priceAlertTitle': 'Уведомить когда цена упадёт ниже…',

    // ------- Station detail
    'detail.reviews': '{n} отзывов',
    'detail.route': 'Маршрут',
    'detail.reportPrice': 'Сообщить цену',
    'detail.prices.title': 'Цены на топливо',
    'detail.prices.empty.title': 'Цены ещё не указаны',
    'detail.prices.empty.hint': 'Заправлялись здесь? Сообщите цену через кнопку выше.',
    'detail.priceHistory.title': 'История цен',
    'detail.routePicker.title': 'Открыть в…',
    'detail.routePicker.yandex': 'Yandex Карты',
    'detail.routePicker.yandexSub': 'или Yandex Навигатор',
    'detail.routePicker.google': 'Google Maps',
    'detail.routePicker.apple': 'Apple Карты',
    'detail.routePicker.appleSub': 'iPhone / iPad',
    'detail.routePicker.hint': 'Откроется приложение, если установлено, иначе веб-версия.',

    // ------- Submit price
    'submit.title': 'Сообщить цену',
    'submit.authRequired': 'Чтобы отправить цену, нужно войти.',
    'submit.authRequiredCta': 'Войти →',
    'submit.photo.shoot': 'Сфотографируйте табло цен',
    'submit.photo.gallery': 'или выберите из галереи',
    'submit.photo.uploading': 'Загружаем…',
    'submit.photo.replace': 'Заменить фото',
    'submit.photo.remove': 'Убрать фото',
    'submit.photo.uploadFailed': 'Не удалось загрузить фото',
    'submit.station.label': 'АЗС',
    'submit.station.searchPlaceholder': 'Найти другую АЗС…',
    'submit.fuel.label': 'Тип топлива',
    'submit.price.label': 'Цена за литр',
    'submit.ocr.detecting': 'Распознаём цены на фото…',
    'submit.ocr.candidates': 'Распознано на фото — нажми нужную:',
    'submit.cta.submit': 'Подтвердить',
    'submit.cta.submitting': 'Отправляем…',
    'submit.success': 'Спасибо! Цена отправлена на проверку. После подтверждения она появится у всех.',
    'submit.karmaHint': '+10 кармы за подтверждённую цену',

    // ------- Profile
    'profile.signOut': 'Выйти',
    'profile.signIn': 'Войти',
    'profile.karmaSuffix': 'кармы',
    'profile.stats.prices': 'цен',
    'profile.stats.saved': '֏ сэкономлено',
    'profile.stats.stations': 'АЗС',
    'profile.recentFills': 'Последние заправки',
    'profile.viewAll': 'Все',
    'profile.savedStations': 'Сохранённые АЗС',
    'profile.achievements': 'Достижения',

    // ------- History
    'history.title': 'История заправок',
    'history.totalSpent': 'Всего потрачено',
    'history.totalLiters': 'Всего литров',
    'history.litersSuffix': 'л',

    // ------- Fuels
    'fuel.92': '92',
    'fuel.95': '95',
    'fuel.98': '98',
    'fuel.diesel': 'Дизель',
    'fuel.lpg': 'LPG',
    'fuel.cng': 'CNG',
    'fuel.92.full': 'АИ-92',
    'fuel.95.full': 'АИ-95',
    'fuel.98.full': 'АИ-98',

    // ------- Relative time
    'time.justNow': 'только что',
    'time.minutes': '{n} мин назад',
    'time.hours': '{n} ч назад',
    'time.days': '{n} дн назад',
    'time.longAgo': 'давно',

    // ------- Admin
    'admin.title': 'Модерация цен',
    'admin.empty': 'Pending-репортов нет',
    'admin.confirm': 'Подтвердить',
    'admin.reject': 'Отклонить',
    'admin.report.fuel': 'Топливо',
    'admin.report.price': 'Цена',
    'admin.report.user': 'От',
    'admin.report.viewPhoto': 'Открыть фото',
    'admin.notAdmin': 'Этот раздел доступен только админам.',
    'profile.adminLink': 'Модерация цен',

    // ------- Generic errors / states
    'error.generic': 'Что-то пошло не так',
    'state.noStations': 'Нет заправок',
  },

  hy: {
    // ------- Common
    'common.back': 'Հետ',
    'common.cancel': 'Չեղարկել',
    'common.save': 'Պահպանել',
    'common.close': 'Փակել',
    'common.loading': 'Բեռնում…',
    'common.send': 'Ուղարկել',
    'common.confirm': 'Հաստատել',
    'common.retry': 'Կրկնել',
    'common.km': 'կմ',
    'common.amd': '֏',

    // ------- Bottom nav
    'nav.map': 'Քարտեզ',
    'nav.list': 'Ցուցակ',
    'nav.history': 'Պատմություն',
    'nav.profile': 'Պրոֆիլ',

    // ------- Onboarding
    'onboarding.tagline': 'Հայաստանի բոլոր ԲԿ-ները մեկ հավելվածում',
    'onboarding.feature.map': 'Քարտեզ՝ 250+ ԲԿ ամբողջ երկրով',
    'onboarding.feature.cheaper': 'Համեմատիր գները և տնտեսիր մինչև 30 ֏/լիտր',
    'onboarding.feature.alerts': 'Ծանուցումներ գների անկման մասին',
    'onboarding.cta.register': 'Գրանցում',
    'onboarding.cta.login': 'Մուտք',
    'onboarding.cta.guest': 'Մուտք՝ որպես հյուր',

    // ------- Login
    'login.title': 'Մուտք',
    'login.subtitle': 'Մուտքի համար մուտքագրիր email-ը և գաղտնաբառը։',
    'login.email': 'Email',
    'login.password': 'Գաղտնաբառ',
    'login.passwordPlaceholder': 'Նվազագույնը 6 նիշ',
    'login.submit': 'Մուտք',
    'login.submitting': 'Մուտք ենք գործում…',
    'login.noAccount': 'Չունե՞ս հաշիվ։',
    'login.goToRegister': 'Գրանցվել',
    'login.invalidCredentials': 'Սխալ email կամ գաղտնաբառ',

    // ------- Register
    'register.title': 'Գրանցում',
    'register.subtitle': 'Ստեղծիր հաշիվ՝ գները հայտնելու և կարմա ստանալու համար։',
    'register.name': 'Անուն',
    'register.namePlaceholder': 'Ինչպե՞ս է քո անունը',
    'register.confirmPassword': 'Հաստատիր գաղտնաբառը',
    'register.confirmPlaceholder': 'Կրկնիր գաղտնաբառը',
    'register.passwordsDontMatch': 'Գաղտնաբառերը չեն համընկնում',
    'register.submit': 'Գրանցվել',
    'register.submitting': 'Ստեղծում ենք հաշիվը…',
    'register.haveAccount': 'Արդեն ունե՞ս հաշիվ։',
    'register.goToLogin': 'Մուտք',

    // ------- Map
    'map.searchPlaceholder': 'Երևան…',
    'map.brands.title': 'Ցանցեր',
    'map.brands.reset': 'Զրոյացնել',
    'map.sort.distance': 'Ավելի մոտ',
    'map.sort.price': 'Ավելի էժան',
    'map.bottomSheet.count': '{n} ԲԿ մոտակայքում',
    'map.location.notSupported': 'Բրաուզերը չի աջակցում աշխարհագրական դիրքը',
    'map.location.denied': 'Աշխարհագրական դիրքի մուտքն արգելված է',
    'map.location.failed': 'Չհաջողվեց որոշել դիրքը',
    'map.location.timeout': 'Սպասման ժամանակը սպառվել է',

    // ------- List
    'list.priceFromAvg': '{diff} ֏ միջինից',
    'list.cheapest': 'Ամենաէժանը',

    // ------- Cheapest
    'cheapest.title': 'Այսօր ամենաէժանը',
    'cheapest.subtitle': 'Թարմացված է {time}',
    'cheapest.priceAlertTitle': 'Տեղեկացնել, երբ գինը իջնի…',

    // ------- Station detail
    'detail.reviews': '{n} կարծիք',
    'detail.route': 'Երթուղի',
    'detail.reportPrice': 'Հայտնել գինը',
    'detail.prices.title': 'Վառելիքի գներ',
    'detail.prices.empty.title': 'Գները դեռ նշված չեն',
    'detail.prices.empty.hint': 'Լցավորվել ե՞ս այստեղ։ Հայտնիր գինը վերևի կոճակով։',
    'detail.priceHistory.title': 'Գների պատմություն',
    'detail.routePicker.title': 'Բացել…',
    'detail.routePicker.yandex': 'Yandex Քարտեզներ',
    'detail.routePicker.yandexSub': 'կամ Yandex Նավիգատոր',
    'detail.routePicker.google': 'Google Maps',
    'detail.routePicker.apple': 'Apple Քարտեզներ',
    'detail.routePicker.appleSub': 'iPhone / iPad',
    'detail.routePicker.hint': 'Կբացվի հավելվածը, եթե տեղադրված է, հակառակ դեպքում՝ վեբ տարբերակը։',

    // ------- Submit price
    'submit.title': 'Հայտնել գինը',
    'submit.authRequired': 'Գին ուղարկելու համար անհրաժեշտ է մուտք գործել։',
    'submit.authRequiredCta': 'Մուտք →',
    'submit.photo.shoot': 'Լուսանկարիր գների ցուցատախտակը',
    'submit.photo.gallery': 'կամ ընտրիր պատկերասրահից',
    'submit.photo.uploading': 'Բեռնում ենք…',
    'submit.photo.replace': 'Փոխարինել լուսանկարը',
    'submit.photo.remove': 'Հեռացնել լուսանկարը',
    'submit.photo.uploadFailed': 'Չհաջողվեց բեռնել լուսանկարը',
    'submit.station.label': 'ԲԿ',
    'submit.station.searchPlaceholder': 'Գտնել ուրիշ ԲԿ…',
    'submit.fuel.label': 'Վառելիքի տեսակ',
    'submit.price.label': 'Գին մեկ լիտրի համար',
    'submit.ocr.detecting': 'Ճանաչում ենք գները լուսանկարից…',
    'submit.ocr.candidates': 'Ճանաչվեց լուսանկարում — սեղմիր անհրաժեշտը՝',
    'submit.cta.submit': 'Հաստատել',
    'submit.cta.submitting': 'Ուղարկում ենք…',
    'submit.success': 'Շնորհակալություն։ Գինը ուղարկվել է ստուգման։ Հաստատումից հետո կհայտնվի բոլորի մոտ։',
    'submit.karmaHint': '+10 կարմա հաստատված գնի համար',

    // ------- Profile
    'profile.signOut': 'Ելք',
    'profile.signIn': 'Մուտք',
    'profile.karmaSuffix': 'կարմա',
    'profile.stats.prices': 'գին',
    'profile.stats.saved': '֏ խնայված',
    'profile.stats.stations': 'ԲԿ',
    'profile.recentFills': 'Վերջին լցավորումները',
    'profile.viewAll': 'Բոլորը',
    'profile.savedStations': 'Պահպանված ԲԿ-ներ',
    'profile.achievements': 'Նվաճումներ',

    // ------- History
    'history.title': 'Լցավորումների պատմություն',
    'history.totalSpent': 'Ընդհանուր ծախսված',
    'history.totalLiters': 'Ընդհանուր լիտր',
    'history.litersSuffix': 'լ',

    // ------- Fuels
    'fuel.92': '92',
    'fuel.95': '95',
    'fuel.98': '98',
    'fuel.diesel': 'Դիզել',
    'fuel.lpg': 'LPG',
    'fuel.cng': 'CNG',
    'fuel.92.full': 'Ա-92',
    'fuel.95.full': 'Ա-95',
    'fuel.98.full': 'Ա-98',

    // ------- Relative time
    'time.justNow': 'հենց նոր',
    'time.minutes': '{n} ր առաջ',
    'time.hours': '{n} ժ առաջ',
    'time.days': '{n} օր առաջ',
    'time.longAgo': 'վաղուց',

    // ------- Admin
    'admin.title': 'Գների մոդերացիա',
    'admin.empty': 'Սպասող ռեպորտներ չկան',
    'admin.confirm': 'Հաստատել',
    'admin.reject': 'Մերժել',
    'admin.report.fuel': 'Վառելիք',
    'admin.report.price': 'Գին',
    'admin.report.user': 'Ումից',
    'admin.report.viewPhoto': 'Բացել լուսանկարը',
    'admin.notAdmin': 'Այս բաժինը հասանելի է միայն ադմինների համար։',
    'profile.adminLink': 'Գների մոդերացիա',

    // ------- Generic errors / states
    'error.generic': 'Ինչ-որ բան սխալ գնաց',
    'state.noStations': 'ԲԿ-ներ չկան',
  },
} as const;

export type TranslationKey = keyof typeof dict.ru;

// Sanity-check at build time that hy has the same keys as ru.
type _AssertSameKeys = (typeof dict.hy)[TranslationKey];

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const template = (dict[locale] ?? dict.ru)[key] as string;
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}
