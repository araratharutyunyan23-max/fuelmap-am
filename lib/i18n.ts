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
    'nav.telegram': 'Telegram',
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

    // ------- Reviews
    'reviews.title': 'Отзывы',
    'reviews.empty': 'Пока нет отзывов. Будьте первым!',
    'reviews.leaveReview': 'Оставить отзыв',
    'reviews.loginToReview': 'Войдите, чтобы оставить отзыв',
    'reviews.yourReview': 'Ваш отзыв',
    'reviews.yourRating': 'Ваша оценка',
    'reviews.commentPlaceholder': 'Расскажите о заправке (необязательно)',
    'reviews.submit': 'Опубликовать',
    'reviews.edit': 'Редактировать',
    'reviews.delete': 'Удалить',
    'reviews.deleteConfirm': 'Удалить ваш отзыв?',
    'reviews.errorRating': 'Поставьте оценку от 1 до 5',
    'reviews.anonymous': 'Гость',

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
    'profile.privacy': 'Политика конфиденциальности',
    'profile.terms': 'Условия использования',
    'profile.mySubmissions.title': 'Мои отправки цен',
    'profile.mySubmissions.empty': 'Вы ещё не отправляли цены. Сообщите цену со станции — поможете другим водителям.',
    'profile.mySubmissions.confirmed': 'Подтв.',
    'profile.mySubmissions.pending': 'На пров.',
    'profile.mySubmissions.rejected': 'Отклон.',

    // ------- Fuels (same labels in every locale — these are the names
    // printed on Armenian pump boards regardless of the UI language).
    'fuel.92': 'Regular',
    'fuel.95': 'Premium',
    'fuel.98': 'Super',
    'fuel.diesel': 'Diesel',
    'fuel.lpg': 'LPG',
    'fuel.92.full': 'Regular',
    'fuel.95.full': 'Premium',
    'fuel.98.full': 'Super',

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
    'nav.telegram': 'Telegram',
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

    // ------- Reviews
    'reviews.title': 'Կարծիքներ',
    'reviews.empty': 'Դեռ կարծիքներ չկան։ Եղիր առաջինը։',
    'reviews.leaveReview': 'Թողնել կարծիք',
    'reviews.loginToReview': 'Մուտք գործիր կարծիք թողնելու համար',
    'reviews.yourReview': 'Քո կարծիքը',
    'reviews.yourRating': 'Քո գնահատականը',
    'reviews.commentPlaceholder': 'Պատմիր լցակայանի մասին (պարտադիր չէ)',
    'reviews.submit': 'Հրապարակել',
    'reviews.edit': 'Խմբագրել',
    'reviews.delete': 'Ջնջել',
    'reviews.deleteConfirm': 'Ջնջել քո կարծիքը։',
    'reviews.errorRating': 'Տուր գնահատական 1-ից 5',
    'reviews.anonymous': 'Հյուր',

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
    'profile.privacy': 'Գաղտնիության քաղաքականություն',
    'profile.terms': 'Օգտագործման պայմաններ',
    'profile.mySubmissions.title': 'Իմ ուղարկած գները',
    'profile.mySubmissions.empty': 'Դու դեռ գին չես ուղարկել։ Հայտնիր լցակայանից գինը — կօգնես այլ վարորդների։',
    'profile.mySubmissions.confirmed': 'Հաստ.',
    'profile.mySubmissions.pending': 'Ստուգման',
    'profile.mySubmissions.rejected': 'Մերժ.',

    // ------- Fuels (same labels in every locale — these are the names
    // printed on Armenian pump boards regardless of the UI language).
    'fuel.92': 'Regular',
    'fuel.95': 'Premium',
    'fuel.98': 'Super',
    'fuel.diesel': 'Diesel',
    'fuel.lpg': 'LPG',
    'fuel.92.full': 'Regular',
    'fuel.95.full': 'Premium',
    'fuel.98.full': 'Super',

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
