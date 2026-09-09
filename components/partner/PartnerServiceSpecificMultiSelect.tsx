'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from './PartnerServiceSpecificMultiSelect.module.css';

type LocaleCode =
  | 'th'
  | 'en'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko';

type DropdownKind =
  | 'menuOptions'
  | 'dietary';

type Option = {
  value: string;
  label: string;
};

type Props = {
  locale: string;
  kind: DropdownKind;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

const TEXT = {
  th: {
    done: 'เสร็จสิ้น',

    menuOptions: [
      ['Small', 'Small'],
      ['Medium', 'Medium'],
      ['Large', 'Large'],
      ['Hot', 'Hot'],
      ['Iced', 'Iced'],
      ['ปกติ', 'ปกติ'],
      ['หวานน้อย', 'หวานน้อย'],
      ['ไม่หวาน', 'ไม่หวาน'],
      ['เพิ่มช็อต', 'เพิ่มช็อต'],
      ['ซื้อกลับบ้าน', 'ซื้อกลับบ้าน'],
    ],

    dietary: [
      ['Vegetarian', 'Vegetarian'],
      ['Vegan', 'Vegan'],
      ['Halal', 'Halal'],
      ['ไม่มีหมู', 'ไม่มีหมู'],
      ['Gluten-free', 'Gluten-free'],
      ['Dairy-free', 'Dairy-free'],
      ['มีถั่ว', 'มีถั่ว'],
      ['มีนม / ผลิตภัณฑ์นม', 'มีนม / ผลิตภัณฑ์นม'],
      ['มีไข่', 'มีไข่'],
      ['มีกลูเตน', 'มีกลูเตน'],
      ['มีอาหารทะเล', 'มีอาหารทะเล'],
      ['เผ็ด', 'เผ็ด'],
    ],
  },

  en: {
    done: 'Done',

    menuOptions: [
      ['Small', 'Small'],
      ['Medium', 'Medium'],
      ['Large', 'Large'],
      ['Hot', 'Hot'],
      ['Iced', 'Iced'],
      ['Regular', 'Regular'],
      ['Less sweet', 'Less sweet'],
      ['No sugar', 'No sugar'],
      ['Extra shot', 'Extra shot'],
      ['Take away', 'Take away'],
    ],

    dietary: [
      ['Vegetarian', 'Vegetarian'],
      ['Vegan', 'Vegan'],
      ['Halal', 'Halal'],
      ['No pork', 'No pork'],
      ['Gluten-free', 'Gluten-free'],
      ['Dairy-free', 'Dairy-free'],
      ['Contains nuts', 'Contains nuts'],
      ['Contains milk / dairy', 'Contains milk / dairy'],
      ['Contains egg', 'Contains egg'],
      ['Contains gluten', 'Contains gluten'],
      ['Contains seafood', 'Contains seafood'],
      ['Spicy', 'Spicy'],
    ],
  },

  de: {
    done: 'Fertig',

    menuOptions: [
      ['Small', 'Small'],
      ['Medium', 'Medium'],
      ['Large', 'Large'],
      ['Hot', 'Heiß'],
      ['Iced', 'Kalt'],
      ['Normal', 'Normal'],
      ['Weniger süß', 'Weniger süß'],
      ['Ohne Zucker', 'Ohne Zucker'],
      ['Extra Shot', 'Extra Shot'],
      ['Zum Mitnehmen', 'Zum Mitnehmen'],
    ],

    dietary: [
      ['Vegetarian', 'Vegetarisch'],
      ['Vegan', 'Vegan'],
      ['Halal', 'Halal'],
      ['Ohne Schweinefleisch', 'Ohne Schweinefleisch'],
      ['Gluten-free', 'Glutenfrei'],
      ['Dairy-free', 'Laktosefrei'],
      ['Enthält Nüsse', 'Enthält Nüsse'],
      ['Enthält Milch', 'Enthält Milch / Milchprodukte'],
      ['Enthält Ei', 'Enthält Ei'],
      ['Enthält Gluten', 'Enthält Gluten'],
      ['Enthält Meeresfrüchte', 'Enthält Meeresfrüchte'],
      ['Scharf', 'Scharf'],
    ],
  },

  zh: {
    done: '完成',

    menuOptions: [
      ['Small', '小'],
      ['Medium', '中'],
      ['Large', '大'],
      ['Hot', '热'],
      ['Iced', '冰'],
      ['Regular', '正常'],
      ['Less sweet', '少糖'],
      ['No sugar', '无糖'],
      ['Extra shot', '加浓缩'],
      ['Take away', '外带'],
    ],

    dietary: [
      ['Vegetarian', '素食'],
      ['Vegan', '纯素'],
      ['Halal', '清真'],
      ['No pork', '不含猪肉'],
      ['Gluten-free', '无麸质'],
      ['Dairy-free', '无乳制品'],
      ['Contains nuts', '含坚果'],
      ['Contains milk', '含牛奶 / 乳制品'],
      ['Contains egg', '含鸡蛋'],
      ['Contains gluten', '含麸质'],
      ['Contains seafood', '含海鲜'],
      ['Spicy', '辣'],
    ],
  },

  ja: {
    done: '完了',

    menuOptions: [
      ['Small', 'Small'],
      ['Medium', 'Medium'],
      ['Large', 'Large'],
      ['Hot', 'Hot'],
      ['Iced', 'Iced'],
      ['Regular', '通常'],
      ['Less sweet', '甘さ控えめ'],
      ['No sugar', '無糖'],
      ['Extra shot', 'ショット追加'],
      ['Take away', 'テイクアウト'],
    ],

    dietary: [
      ['Vegetarian', 'ベジタリアン'],
      ['Vegan', 'ヴィーガン'],
      ['Halal', 'ハラール'],
      ['No pork', '豚肉なし'],
      ['Gluten-free', 'グルテンフリー'],
      ['Dairy-free', '乳製品不使用'],
      ['Contains nuts', 'ナッツを含む'],
      ['Contains milk', '牛乳 / 乳製品を含む'],
      ['Contains egg', '卵を含む'],
      ['Contains gluten', 'グルテンを含む'],
      ['Contains seafood', '魚介類を含む'],
      ['Spicy', '辛い'],
    ],
  },

  ko: {
    done: '완료',

    menuOptions: [
      ['Small', 'Small'],
      ['Medium', 'Medium'],
      ['Large', 'Large'],
      ['Hot', 'Hot'],
      ['Iced', 'Iced'],
      ['Regular', '기본'],
      ['Less sweet', '덜 달게'],
      ['No sugar', '무가당'],
      ['Extra shot', '샷 추가'],
      ['Take away', '포장'],
    ],

    dietary: [
      ['Vegetarian', '채식'],
      ['Vegan', '비건'],
      ['Halal', '할랄'],
      ['No pork', '돼지고기 없음'],
      ['Gluten-free', '글루텐 프리'],
      ['Dairy-free', '유제품 없음'],
      ['Contains nuts', '견과류 포함'],
      ['Contains milk', '우유 / 유제품 포함'],
      ['Contains egg', '계란 포함'],
      ['Contains gluten', '글루텐 포함'],
      ['Contains seafood', '해산물 포함'],
      ['Spicy', '매운맛'],
    ],
  },
} as const;

function localeOf(value: string): LocaleCode {
  if (
    value === 'th' ||
    value === 'en' ||
    value === 'de' ||
    value === 'zh' ||
    value === 'ja' ||
    value === 'ko'
  ) {
    return value;
  }

  return 'en';
}

function splitValues(value: string) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PartnerServiceSpecificMultiSelect({
  locale,
  kind,
  value,
  placeholder,
  onChange,
}: Props) {
  const normalizedLocale = localeOf(locale);
  const copy = TEXT[normalizedLocale];

  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] =
    useState(false);

  const selected =
    useMemo(
      () =>
        splitValues(value),
      [value],
    );

  const options: Option[] =
    useMemo(
      () =>
        copy[kind].map(
          ([optionValue, label]) => ({
            value: optionValue,
            label,
          }),
        ),
      [copy, kind],
    );

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        !rootRef.current ||
        rootRef.current.contains(
          event.target as Node,
        )
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );
    };
  }, []);

  function isSelected(
    option: Option,
  ) {
    return selected.some(
      (item) =>
        item === option.value ||
        item === option.label,
    );
  }

  function toggle(
    option: Option,
  ) {
    const active =
      isSelected(option);

    let next: string[];

    if (active) {
      next =
        selected.filter(
          (item) =>
            item !== option.value &&
            item !== option.label,
        );
    } else {
      next = [
        ...selected,
        option.label,
      ];
    }

    onChange(
      next.join(', '),
    );
  }

  const displayValue =
    selected.length
      ? selected.join(', ')
      : placeholder;

  return (
    <div
      ref={rootRef}
      className={
        styles.root
      }
      data-open={
        open
      }
    >
      <button
        type="button"
        className={
          styles.trigger
        }
        data-empty={
          !selected.length
        }
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        aria-expanded={
          open
        }
      >
        <span>
          {
            displayValue
          }
        </span>

        <b>
          {open
            ? '⌃'
            : '⌄'}
        </b>
      </button>

      {open ? (
        <div
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.optionList
            }
          >
            {options.map(
              (option) => {
                const active =
                  isSelected(
                    option,
                  );

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    className={
                      styles.option
                    }
                    data-selected={
                      active
                    }
                    onClick={() =>
                      toggle(
                        option,
                      )
                    }
                  >
                    <span>
                      {
                        option.label
                      }
                    </span>

                    {active ? (
                      <b>
                        ✓
                      </b>
                    ) : null}
                  </button>
                );
              },
            )}
          </div>

          <button
            type="button"
            className={
              styles.done
            }
            onClick={() =>
              setOpen(false)
            }
          >
            {
              copy.done
            }
          </button>
        </div>
      ) : null}
    </div>
  );
}