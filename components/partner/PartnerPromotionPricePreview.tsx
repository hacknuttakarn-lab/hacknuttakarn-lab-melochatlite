'use client';

import styles from './PartnerPromotionPricePreview.module.css';

type PromotionMode =
  | 'none'
  | 'fixed'
  | 'percent';

type LocaleCode =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type Props = {
  locale: string;

  regularPrice: string;

  promotionMode:
    PromotionMode;

  promotionValue:
    string;

  currency:
    string;

  priceUnit:
    string;
};

const COPY = {
  th: {
    preview:
      'ราคาที่ลูกค้าจะเห็น',

    noPrice:
      'กรอกราคาปกติเพื่อดูตัวอย่าง',

    discount:
      'ลด',

    save:
      'ประหยัด',

    priceAfterDiscount:
      'ราคาหลังลด',
  },

  en: {
    preview:
      'Customer price preview',

    noPrice:
      'Enter a regular price to see the preview',

    discount:
      'Discount',

    save:
      'Save',

    priceAfterDiscount:
      'Price after discount',
  },

  de: {
    preview:
      'Preisvorschau für Kunden',

    noPrice:
      'Normalpreis eingeben, um die Vorschau zu sehen',

    discount:
      'Rabatt',

    save:
      'Ersparnis',

    priceAfterDiscount:
      'Preis nach Rabatt',
  },

  zh: {
    preview:
      '顾客看到的价格',

    noPrice:
      '输入正常价格以查看预览',

    discount:
      '优惠',

    save:
      '节省',

    priceAfterDiscount:
      '优惠后价格',
  },

  ja: {
    preview:
      'お客様に表示される価格',

    noPrice:
      '通常価格を入力するとプレビューできます',

    discount:
      '割引',

    save:
      'お得',

    priceAfterDiscount:
      '割引後価格',
  },

  ko: {
    preview:
      '고객에게 표시되는 가격',

    noPrice:
      '정상 가격을 입력하면 미리보기가 표시됩니다',

    discount:
      '할인',

    save:
      '절약',

    priceAfterDiscount:
      '할인 후 가격',
  },
} as const;

function localeOf(
  locale:
    string,
): LocaleCode {
  if (
    locale === 'th' ||
    locale === 'en' ||
    locale === 'de' ||
    locale === 'zh' ||
    locale === 'ja' ||
    locale === 'ko'
  ) {
    return locale;
  }

  return 'en';
}

function numberOf(
  value:
    string,
) {
  const clean =
    String(
      value ||
      '',
    ).trim();

  if (!clean) {
    return null;
  }

  const number =
    Number(
      clean,
    );

  if (
    !Number.isFinite(
      number,
    ) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

function formatMoney(
  amount:
    number,
  currency:
    string,
) {
  const safeCurrency =
    String(
      currency ||
      'THB',
    )
      .trim()
      .toUpperCase();

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style:
          'currency',

        currency:
          safeCurrency,

        minimumFractionDigits:
          Number.isInteger(
            amount,
          )
            ? 0
            : 2,

        maximumFractionDigits:
          2,
      },
    ).format(
      amount,
    );
  } catch {
    return `${safeCurrency} ${amount.toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          2,
      },
    )}`;
  }
}

function priceUnitText(
  unit:
    string,
) {
  const clean =
    String(
      unit ||
      '',
    ).trim();

  return clean
    ? ` / ${clean}`
    : '';
}

export default function PartnerPromotionPricePreview({
  locale,
  regularPrice,
  promotionMode,
  promotionValue,
  currency,
  priceUnit,
}: Props) {
  const copy =
    COPY[
      localeOf(
        locale,
      )
    ];

  const regular =
    numberOf(
      regularPrice,
    );

  const promo =
    numberOf(
      promotionValue,
    );

  if (
    promotionMode ===
    'none'
  ) {
    return null;
  }

  if (
    regular === null
  ) {
    return (
      <div
        className={
          styles.preview
        }
      >
        <small>
          {
            copy.preview
          }
        </small>

        <p
          className={
            styles.empty
          }
        >
          {
            copy.noPrice
          }
        </p>
      </div>
    );
  }

  let finalPrice =
    regular;

  let discountPercent =
    0;

  let saving =
    0;

  if (
    promotionMode ===
    'fixed'
  ) {
    if (
      promo !== null
    ) {
      finalPrice =
        Math.max(
          0,
          Math.min(
            regular,
            promo,
          ),
        );

      saving =
        Math.max(
          0,
          regular -
            finalPrice,
        );

      if (
        regular > 0
      ) {
        discountPercent =
          (
            saving /
            regular
          ) *
          100;
      }
    }
  }

  if (
    promotionMode ===
    'percent'
  ) {
    const percent =
      Math.max(
        0,
        Math.min(
          100,
          promo ?? 0,
        ),
      );

    discountPercent =
      percent;

    saving =
      regular *
      (
        percent /
        100
      );

    finalPrice =
      Math.max(
        0,
        regular -
          saving,
      );
  }

  const hasPromotionValue =
    promo !== null;

  return (
    <div
      className={
        styles.preview
      }
    >
      <small>
        {
          copy.preview
        }
      </small>

      {!hasPromotionValue ? (
        <p
          className={
            styles.empty
          }
        >
          {
            promotionMode ===
            'fixed'
              ? copy.priceAfterDiscount
              : `${copy.discount} %`
          }
        </p>
      ) : (
        <>
          <div
            className={
              styles.oldPrice
            }
          >
            {formatMoney(
              regular,
              currency,
            )}
          </div>

          <div
            className={
              styles.finalPrice
            }
          >
            {formatMoney(
              finalPrice,
              currency,
            )}

            <span>
              {priceUnitText(
                priceUnit,
              )}
            </span>
          </div>

          <div
            className={
              styles.meta
            }
          >
            {discountPercent >
            0 ? (
              <strong>
                {copy.discount}{' '}
                {discountPercent.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits:
                      2,
                  },
                )}
                %
              </strong>
            ) : null}

            {saving >
            0 ? (
              <span>
                {copy.save}{' '}
                {formatMoney(
                  saving,
                  currency,
                )}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}