import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности · FuelMap Armenia',
  description:
    'Какие данные FuelMap Armenia собирает о пользователях и как они используются.',
};

const UPDATED = '2 мая 2026';

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none px-5 py-8 text-[15px] leading-relaxed">
      <p className="mb-6">
        <Link
          href="/"
          className="text-emerald-600 hover:underline text-sm"
        >
          ← FuelMap Armenia
        </Link>
      </p>

      <div className="flex gap-3 mb-6 text-sm">
        <a href="#ru" className="text-emerald-600 hover:underline">
          Русский
        </a>
        <a href="#hy" className="text-emerald-600 hover:underline">
          Հայերեն
        </a>
      </div>

      {/* ---------- Russian ---------- */}
      <section id="ru" className="mb-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-slate-500 mb-6">Обновлено: {UPDATED}</p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Кто мы</h2>
        <p>
          FuelMap Armenia — приложение, которое показывает цены на топливо на
          АЗС Армении. Сайт: <a href="https://fuelmap.app">fuelmap.app</a>.
          Связь: <a href="https://t.me/fuelmap_armenia">t.me/fuelmap_armenia</a>.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Какие данные мы собираем
        </h2>
        <ul className="list-disc pl-6">
          <li>
            <b>Email и имя</b> — при регистрации, для входа в аккаунт и
            отображения в отзывах.
          </li>
          <li>
            <b>Отзывы и оценки</b> — публично видны другим пользователям рядом с
            АЗС.
          </li>
          <li>
            <b>Фото табло цен</b> — когда вы отправляете цену, фото
            обрабатывается через Google Cloud Vision OCR и хранится в нашем
            хранилище.
          </li>
          <li>
            <b>Геолокация</b> — только если вы её разрешите. Используется
            только в браузере для расчёта расстояния до АЗС, на сервер не
            отправляется.
          </li>
          <li>
            <b>Технические данные</b> — IP-адрес, тип браузера, обезличенная
            аналитика (Vercel Analytics) для понимания использования.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Зачем мы их используем
        </h2>
        <ul className="list-disc pl-6">
          <li>Чтобы вы могли войти и пользоваться функциями приложения.</li>
          <li>
            Чтобы публиковать ваши отзывы и репорты цен — другие пользователи
            видят это значение.
          </li>
          <li>
            Чтобы отправлять важные письма (восстановление пароля,
            подтверждение).
          </li>
          <li>Чтобы улучшать сервис на основе обезличенной статистики.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          С кем мы делимся
        </h2>
        <p>
          Мы не продаём ваши данные. Передаём минимум для работы сервиса:
        </p>
        <ul className="list-disc pl-6">
          <li>
            <b>Supabase</b> (хостинг базы данных и авторизация) — США.
          </li>
          <li>
            <b>Vercel</b> (хостинг приложения, аналитика) — США.
          </li>
          <li>
            <b>Resend</b> (отправка email) — США.
          </li>
          <li>
            <b>Google Cloud Vision</b> (OCR с фотографий цен) — США. Только сами
            фото, без привязки к вашему профилю.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Сколько храним
        </h2>
        <p>
          Аккаунт и связанные данные — пока вы не попросите удалить. После
          удаления — стираем в течение 30 дней. Отзывы и репорты цен,
          опубликованные публично, могут остаться в обезличенном виде (без
          имени).
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Ваши права</h2>
        <p>
          Согласно GDPR и закону Армении о защите персональных данных, вы
          имеете право:
        </p>
        <ul className="list-disc pl-6">
          <li>Получить копию ваших данных.</li>
          <li>Исправить неточные данные.</li>
          <li>Удалить аккаунт и связанные данные.</li>
          <li>Отозвать согласие на обработку.</li>
        </ul>
        <p>
          Чтобы воспользоваться — напишите{' '}
          <a href="mailto:araratharutyunyan23@gmail.com">
            araratharutyunyan23@gmail.com
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Cookies</h2>
        <p>
          Используем минимум: только техническая cookie для входа в аккаунт.
          Рекламных и трекинговых cookie нет.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Дети</h2>
        <p>
          Сервис не предназначен для лиц младше 13 лет.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Изменения</h2>
        <p>
          Если изменим политику существенно — оповестим по email и в Telegram-
          канале до того, как изменения вступят в силу.
        </p>
      </section>

      {/* ---------- Armenian ---------- */}
      <section id="hy" className="mb-12 border-t border-slate-200 pt-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Գաղտնիության քաղաքականություն
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Թարմացվել է՝ 2026 թ․ մայիսի 2
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Ով ենք մենք</h2>
        <p>
          FuelMap Armenia-ը հավելված է, որը ցույց է տալիս Հայաստանի լցակայանների
          վառելիքի գները։ Կայք՝ <a href="https://fuelmap.app">fuelmap.app</a>։
          Կապ՝{' '}
          <a href="https://t.me/fuelmap_armenia">t.me/fuelmap_armenia</a>։
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Ինչ տվյալներ ենք հավաքում
        </h2>
        <ul className="list-disc pl-6">
          <li>
            <b>Էլ․ փոստ և անուն</b> — գրանցման ժամանակ, մուտքի և կարծիքներում
            ցուցադրման համար։
          </li>
          <li>
            <b>Կարծիքներ և գնահատականներ</b> — հանրորեն տեսանելի են այլ
            օգտատերերի համար։
          </li>
          <li>
            <b>Գների ցուցատախտակի լուսանկարներ</b> — մշակվում են Google Cloud
            Vision OCR-ով և պահվում մեր պահեստում։
          </li>
          <li>
            <b>Աշխարհագրական դիրք</b> — միայն ձեր թույլտվությամբ։ Օգտագործվում
            է զննարկչում՝ լցակայանի հեռավորությունը հաշվելու համար, սերվեր չի
            ուղարկվում։
          </li>
          <li>
            <b>Տեխնիկական տվյալներ</b> — IP-հասցե, զննարկչի տեսակ, անանուն
            վերլուծաբանություն (Vercel Analytics)։
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Ինչու ենք օգտագործում</h2>
        <ul className="list-disc pl-6">
          <li>Որպեսզի դուք կարողանաք մուտք գործել և օգտագործել հավելվածի գործառույթները։</li>
          <li>Որպեսզի հրապարակենք ձեր կարծիքները և գների մասին հաղորդումները։</li>
          <li>Որպեսզի ուղարկենք կարևոր նամակներ (գաղտնաբառի վերականգնում)։</li>
          <li>Որպեսզի բարելավենք ծառայությունն անանուն վիճակագրության հիման վրա։</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Ում հետ ենք կիսվում</h2>
        <p>Ձեր տվյալները չենք վաճառում։ Փոխանցում ենք միայն աշխատանքի համար անհրաժեշտը՝</p>
        <ul className="list-disc pl-6">
          <li>
            <b>Supabase</b> (տվյալների բազայի և մուտքի հոստինգ) — ԱՄՆ։
          </li>
          <li>
            <b>Vercel</b> (հավելվածի հոստինգ, վերլուծաբանություն) — ԱՄՆ։
          </li>
          <li>
            <b>Resend</b> (էլ․ նամակների ուղարկում) — ԱՄՆ։
          </li>
          <li>
            <b>Google Cloud Vision</b> (լուսանկարների OCR) — ԱՄՆ։ Միայն
            լուսանկարներն, առանց ձեր պրոֆիլի կապի։
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Որքան պահում ենք</h2>
        <p>
          Հաշիվ և կապված տվյալներ՝ մինչև ջնջման հայտը։ Ջնջումից հետո՝ 30 օրվա
          ընթացքում մաքրում ենք։ Հանրորեն հրապարակված կարծիքներն ու գնային
          հաշվետվությունները կարող են մնալ անանուն տեսքով։
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Ձեր իրավունքները</h2>
        <p>
          GDPR-ի և Հայաստանի անձնական տվյալների պաշտպանության օրենքի համաձայն՝
          դուք իրավունք ունեք՝
        </p>
        <ul className="list-disc pl-6">
          <li>Ստանալ ձեր տվյալների պատճենը։</li>
          <li>Ուղղել ոչ ճշգրիտ տվյալները։</li>
          <li>Ջնջել հաշիվը և կապված տվյալները։</li>
          <li>Հետ կանչել տվյալների մշակման համաձայնությունը։</li>
        </ul>
        <p>
          Կիրառելու համար գրեք{' '}
          <a href="mailto:araratharutyunyan23@gmail.com">
            araratharutyunyan23@gmail.com
          </a>
          ։
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Cookies</h2>
        <p>
          Օգտագործում ենք միայն մուտքի համար անհրաժեշտ տեխնիկական cookie։
          Գովազդային կամ հետևող cookies չկան։
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Երեխաներ</h2>
        <p>
          Ծառայությունը նախատեսված չէ 13 տարեկանից փոքրերի համար։
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Փոփոխություններ</h2>
        <p>
          Քաղաքականության էական փոփոխությունների դեպքում կզգուշացնենք էլ․ փոստով
          և Telegram ալիքով նախքան ուժի մեջ մտնելը։
        </p>
      </section>
    </article>
  );
}
