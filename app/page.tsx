'use client';

import Image from 'next/image';

import { Header } from '@/components/Header';
import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';

import { useLocale } from '@/components/SiteProviders';
import { authCopy } from '@/i18n/authUi';

const featureIcons = [
  '♡',
  '↗',
  '✦',
  '◎',
  '％',
  '⌁',
  '✚',
  '◆',
] as const;

export default function HomePage() {
  const {
    t,
    locale,
  } = useLocale();

  const auth =
    authCopy[locale];

  const features = [
    [
      'feature.connect.title',
      'feature.connect.body',
    ],
    [
      'feature.trip.title',
      'feature.trip.body',
    ],
    [
      'feature.event.title',
      'feature.event.body',
    ],
    [
      'feature.community.title',
      'feature.community.body',
    ],
    [
      'feature.deals.title',
      'feature.deals.body',
    ],
    [
      'feature.partner.title',
      'feature.partner.body',
    ],
    [
      'feature.safety.title',
      'feature.safety.body',
    ],
    [
      'feature.rewards.title',
      'feature.rewards.body',
    ],
  ] as const;

  return (
    <main>
      <Header />

      <PublicLanguageSwitcher />

      <section
        className="heroV2 shell"
        id="home"
      >
        <div className="heroV2Copy">
          <div className="eyebrow">
            <span className="pulseDot" />

            {' '}
            {t(
              'hero.eyebrow',
            )}
          </div>

          <h1>
            {t(
              'hero.title1',
            )}

            <br />

            <span>
              {t(
                'hero.title2',
              )}
            </span>
          </h1>

          <p className="heroLead">
            {t(
              'hero.body',
            )}
          </p>

          <div className="heroActions">
            <a
              className="button primary"
              href="#download"
            >
              {t(
                'hero.download',
              )}
            </a>

            <a
              className="button secondary"
              href="#partner"
            >
              {t(
                'hero.partner',
              )}
            </a>
          </div>

          <div className="heroTrust">
            <span>
              <b>✓</b>

              {t(
                'hero.trust1',
              )}
            </span>

            <span>
              <b>✓</b>

              {t(
                'hero.trust2',
              )}
            </span>

            <span>
              <b>✓</b>

              {t(
                'hero.trust3',
              )}
            </span>
          </div>
        </div>

        <div
          className="meloStage"
          aria-label="Melo app experience preview"
        >
          <div className="stageGlow stageGlowBlue" />

          <div className="stageGlow stageGlowViolet" />

          <article className="floatCard floatTrip">
            <div className="floatCardTop">
              <span className="miniIcon">
                ↗
              </span>

              <small>
                {t(
                  'feature.trip.title',
                )}
              </small>
            </div>

            <strong>
              {t(
                'mock.tripName',
              )}
            </strong>

            <span>
              {t(
                'mock.tripMeta',
              )}
            </span>

            <div className="avatarStack">
              <i>M</i>
              <i>K</i>
              <i>A</i>
              <i>+5</i>
            </div>
          </article>

          <article className="floatCard floatCommunity">
            <div className="communityDots">
              <i />
              <i />
              <i />
            </div>

            <div>
              <small>
                {t(
                  'feature.community.title',
                )}
              </small>

              <strong>
                {t(
                  'homeV2.communityLabel',
                )}
              </strong>
            </div>
          </article>

          <div className="phoneV2 phoneV2Back">
            <div className="phoneNotch" />

            <div className="phoneBar">
              <b>9:41</b>

              <span>
                ● ● ●
              </span>
            </div>

            <div className="tripScreenTitle">
              <strong>
                {t(
                  'feature.trip.title',
                )}
              </strong>

              <span>
                ＋
              </span>
            </div>

            <div className="tripScene">
              <span>
                {t(
                  'mock.featured',
                )}
              </span>

              <div>
                <strong>
                  {t(
                    'mock.tripName',
                  )}
                </strong>

                <small>
                  {t(
                    'mock.tripMeta',
                  )}
                </small>
              </div>
            </div>

            <div className="planStack">
              <div>
                <i>01</i>

                <span>
                  {t(
                    'mock.plan1',
                  )}
                </span>
              </div>

              <div>
                <i>02</i>

                <span>
                  {t(
                    'mock.plan2',
                  )}
                </span>
              </div>

              <div>
                <i>03</i>

                <span>
                  {t(
                    'mock.plan3',
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="phoneV2 phoneV2Front">
            <div className="phoneNotch" />

            <div className="phoneBar">
              <b>9:41</b>

              <span>
                ● ● ●
              </span>
            </div>

            <div className="mockHeader">
              <Image
                src="/melo-logo.png"
                alt="Melo Chat"
                width={34}
                height={34}
                priority
              />

              <div>
                <strong>
                  Melo Chat
                </strong>

                <small>
                  {t(
                    'mock.discover',
                  )}
                </small>
              </div>

              <span className="roundIcon">
                ✦
              </span>
            </div>

            <div className="modePills">
              <b>
                {t(
                  'homeV2.friend',
                )}
              </b>

              <span>
                {t(
                  'homeV2.love',
                )}
              </span>
            </div>

            <div className="connectCard">
              <div className="connectPhoto">
                <div className="connectBadges">
                  <span>
                    ♐ Sagittarius
                  </span>

                  <span>
                    ⌖ 4.2 km
                  </span>
                </div>

                <div className="connectProfile">
                  <strong>
                    Mina, 27
                  </strong>

                  <small>
                    Travel · Coffee · Music
                  </small>
                </div>
              </div>

              <div className="connectActions">
                <button>
                  ×
                </button>

                <button>
                  ☆
                </button>

                <button>
                  ♥
                </button>
              </div>
            </div>

            <div className="mockNav">
              <span>⌂</span>
              <span>▤</span>
              <b>♡</b>
              <span>◌</span>
              <span>○</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ecosystemStrip"
        aria-label="Melo ecosystem"
      >
        <div className="shell ecosystemInner">
          <span>
            {t(
              'feature.connect.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.trip.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.event.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.community.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.deals.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.safety.title',
            )}
          </span>

          <i />

          <span>
            {t(
              'feature.rewards.title',
            )}
          </span>
        </div>
      </section>

      <section
        className="section shell"
        id="features"
      >
        <div className="sectionHeading centeredHeading">
          <span className="sectionKicker">
            {t(
              'features.kicker',
            )}
          </span>

          <h2>
            {t(
              'features.title',
            )}
          </h2>

          <p>
            {t(
              'features.body',
            )}
          </p>
        </div>

        <div className="featureMarqueeV2">
          <div className="featureMarqueeTrackV2">
            {[0, 1].map(
              (
                copyIndex,
              ) => (
                <div
                  className="featureMarqueeGroupV2"
                  aria-hidden={
                    copyIndex ===
                    1
                  }
                  key={
                    copyIndex
                  }
                >
                  {features.map(
                    (
                      [
                        title,
                        body,
                      ],
                      index,
                    ) => (
                      <article
                        className={`featureCardV2 featureTone${index + 1}`}
                        key={`${copyIndex}-${title}`}
                      >
                        <div className="featureIconV2">
                          {
                            featureIcons[
                              index
                            ]
                          }
                        </div>

                        <div>
                          <h3>
                            {t(
                              title,
                            )}
                          </h3>

                          <p>
                            {t(
                              body,
                            )}
                          </p>
                        </div>

                        <span className="featureArrow">
                          ↗
                        </span>
                      </article>
                    ),
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section shell storySection">
        <div className="storyPanel storyConnect">
          <div className="storyCopy">
            <span className="sectionKicker">
              {t(
                'homeV2.connectKicker',
              )}
            </span>

            <h2>
              {t(
                'homeV2.connectTitle',
              )}
            </h2>

            <p>
              {t(
                'homeV2.connectBody',
              )}
            </p>

            <div className="storyTags">
              <span>
                ♡{' '}
                {t(
                  'homeV2.friend',
                )}
              </span>

              <span>
                ♥{' '}
                {t(
                  'homeV2.love',
                )}
              </span>
            </div>
          </div>

          <div
            className="miniConnectBoard"
            aria-hidden="true"
          >
            <article>
              <div className="miniPortrait portraitOne">
                <span>
                  ⌖ 2.8 km
                </span>
              </div>

              <strong>
                Nana, 25
              </strong>

              <small>
                Food · Art · Weekend trips
              </small>
            </article>

            <article>
              <div className="miniPortrait portraitTwo">
                <span>
                  ⌖ 6.1 km
                </span>
              </div>

              <strong>
                Alex, 29
              </strong>

              <small>
                Coffee · Hiking · Music
              </small>
            </article>

            <div className="matchBubble">
              <span>
                ♥
              </span>

              <strong>
                {t(
                  'homeV2.matchLabel',
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="storyPanel storyExplore">
          <div
            className="exploreMock"
            aria-hidden="true"
          >
            <div className="routeCard">
              <span className="routeNumber">
                01
              </span>

              <div>
                <strong>
                  {t(
                    'mock.plan1',
                  )}
                </strong>

                <small>
                  09:30 · Chiang Mai
                </small>
              </div>

              <i>
                ✓
              </i>
            </div>

            <div className="routeLine" />

            <div className="routeCard">
              <span className="routeNumber">
                02
              </span>

              <div>
                <strong>
                  {t(
                    'mock.plan2',
                  )}
                </strong>

                <small>
                  13:15 · Mae Rim
                </small>
              </div>

              <i>
                ⌖
              </i>
            </div>

            <div className="routeLine" />

            <div className="routeCard">
              <span className="routeNumber">
                03
              </span>

              <div>
                <strong>
                  {t(
                    'mock.plan3',
                  )}
                </strong>

                <small>
                  18:30 · Old Town
                </small>
              </div>

              <i>
                ✦
              </i>
            </div>
          </div>

          <div className="storyCopy">
            <span className="sectionKicker">
              {t(
                'homeV2.exploreKicker',
              )}
            </span>

            <h2>
              {t(
                'homeV2.exploreTitle',
              )}
            </h2>

            <p>
              {t(
                'homeV2.exploreBody',
              )}
            </p>

            <div className="storyTags">
              <span>
                ↗{' '}
                {t(
                  'feature.trip.title',
                )}
              </span>

              <span>
                ✦{' '}
                {t(
                  'feature.event.title',
                )}
              </span>

              <span>
                ◎{' '}
                {t(
                  'feature.community.title',
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section shell safetySection"
        id="safety"
      >
        <div className="safetyPanelV2">
          <div className="safetyCopy">
            <span className="sectionKicker">
              {t(
                'safety.kicker',
              )}
            </span>

            <h2>
              {t(
                'safety.title',
              )}
            </h2>

            <p>
              {t(
                'safety.body',
              )}
            </p>

            <ul className="safetyList">
              <li>
                <span>
                  ⌖
                </span>

                <div>
                  <strong>
                    {t(
                      'safety.live.title',
                    )}
                  </strong>

                  <small>
                    {t(
                      'safety.live.body',
                    )}
                  </small>
                </div>
              </li>

              <li>
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    {t(
                      'safety.checkin.title',
                    )}
                  </strong>

                  <small>
                    {t(
                      'safety.checkin.body',
                    )}
                  </small>
                </div>
              </li>

              <li>
                <span>
                  !
                </span>

                <div>
                  <strong>
                    {t(
                      'safety.sos.title',
                    )}
                  </strong>

                  <small>
                    {t(
                      'safety.sos.body',
                    )}
                  </small>
                </div>
              </li>
            </ul>
          </div>

          <div
            className="liveMapCard"
            aria-hidden="true"
          >
            <div className="mapTexture" />

            <svg
              className="mapRoute"
              viewBox="0 0 420 320"
              fill="none"
            >
              <path
                d="M65 258C99 214 122 234 151 188C177 148 213 165 240 128C266 91 297 122 355 57"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="1 14"
              />
            </svg>

            <span className="mapPin mapPinStart">
              M
            </span>

            <span className="mapPin mapPinEnd">
              ✓
            </span>

            <div className="liveLocationCard">
              <span className="liveAvatar">
                M
              </span>

              <div>
                <strong>
                  {t(
                    'safety.mockTitle',
                  )}
                </strong>

                <small>
                  {t(
                    'safety.mockBody',
                  )}
                </small>
              </div>

              <b>
                LIVE
              </b>
            </div>

            <button className="sosMock">
              SOS
            </button>
          </div>
        </div>
      </section>

      <section className="section shell rewardsSection">
        <div className="rewardsPanel">
          <div
            className="rewardGraphic"
            aria-hidden="true"
          >
            <div className="rewardCoin coinOne">
              ◆
            </div>

            <div className="rewardCoin coinTwo">
              ✦
            </div>

            <div className="rewardCoin coinThree">
              M
            </div>

            <div className="rewardBalance">
              <small>
                MELO POINTS
              </small>

              <strong>
                2,480
              </strong>

              <span>
                + 120
              </span>
            </div>
          </div>

          <div className="storyCopy">
            <span className="sectionKicker">
              {t(
                'homeV2.rewardsKicker',
              )}
            </span>

            <h2>
              {t(
                'homeV2.rewardsTitle',
              )}
            </h2>

            <p>
              {t(
                'homeV2.rewardsBody',
              )}
            </p>

            <a
              className="textLink"
              href="#features"
            >
              {t(
                'common.learnMore',
              )}

              {' '}

              <span>
                →
              </span>
            </a>
          </div>
        </div>
      </section>

      <section
        className="section shell"
        id="partner"
      >
        <div className="partnerPanelV2">
          <div className="partnerCopy">
            <span className="sectionKicker">
              {t(
                'partner.kicker',
              )}
            </span>

            <h2>
              {t(
                'partner.title',
              )}
            </h2>

            <p>
              {t(
                'partner.body',
              )}
            </p>

            <a
              className="button primary"
              href="#download"
            >
              {t(
                'partner.cta',
              )}
            </a>
          </div>

          <div className="partnerSteps">
            <div>
              <span>
                01
              </span>

              <strong>
                {t(
                  'partner.stat1',
                )}
              </strong>
            </div>

            <div>
              <span>
                02
              </span>

              <strong>
                {t(
                  'partner.stat2',
                )}
              </strong>
            </div>

            <div>
              <span>
                03
              </span>

              <strong>
                {t(
                  'partner.stat3',
                )}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section shell webPortalSection"
        id="web-access"
      >
        <div className="webPortalPanel">
          <div className="webPortalCopy">
            <span className="sectionKicker">
              {
                auth.portalKicker
              }
            </span>

            <h2>
              {
                auth.portalTitle
              }
            </h2>

            <p>
              {
                auth.portalBody
              }
            </p>

            <div className="webPortalBullets">
              <span>
                <i>
                  ✓
                </i>

                {
                  auth.portalFeature1
                }
              </span>

              <span>
                <i>
                  ◐
                </i>

                {
                  auth.portalFeature2
                }
              </span>

              <span>
                <i>
                  ↔
                </i>

                {
                  auth.portalFeature3
                }
              </span>
            </div>

            <div className="webPortalActions">
              <a
                className="button primary"
                href="/login"
              >
                {
                  auth.login
                }
              </a>

              <a
                className="button secondary"
                href="/register"
              >
                {
                  auth.createAccount
                }
              </a>
            </div>
          </div>

          <div
            className="webPortalMock"
            aria-hidden="true"
          >
            <div className="webWindow">
              <div className="webWindowBar">
                <i />
                <i />
                <i />

                <span>
                  melo.chat
                </span>
              </div>

              <div className="webWindowBody">
                <div className="webSideRail">
                  <b>
                    M
                  </b>

                  <i>
                    ⌂
                  </i>

                  <i>
                    ○
                  </i>

                  <i>
                    ↗
                  </i>

                  <i>
                    ⌁
                  </i>
                </div>

                <div className="webAccountPreview">
                  <small>
                    MELO WEB
                  </small>

                  <strong>
                    {
                      auth.webAccess
                    }
                  </strong>

                  <div className="webPreviewCards">
                    <span>
                      ○
                    </span>

                    <span>
                      ↗
                    </span>

                    <span>
                      ⌁
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section shell"
        id="download"
      >
        <div className="downloadPanelV2">
          <div className="downloadHalo" />

          <Image
            src="/melo-logo.png"
            alt="Melo Chat logo"
            width={88}
            height={88}
          />

          <span className="sectionKicker">
            MELO CHAT
          </span>

          <h2>
            {t(
              'download.title',
            )}
          </h2>

          <p>
            {t(
              'download.body',
            )}
          </p>

          <div className="storeButtons">
            <button className="storeButton">
              <span className="storeMark">
                ▶
              </span>

              <div>
                <small>
                  {t(
                    'download.androidSmall',
                  )}
                </small>

                <strong>
                  Google Play
                </strong>
              </div>
            </button>

            <button className="storeButton">
              <span className="storeMark">
                ◆
              </span>

              <div>
                <small>
                  {t(
                    'download.iosSmall',
                  )}
                </small>

                <strong>
                  App Store
                </strong>
              </div>
            </button>
          </div>

          <small className="comingSoon">
            {t(
              'download.comingSoon',
            )}
          </small>
        </div>
      </section>

      <footer className="footerV2">
        <div className="shell footerInner">
          <div className="footerBrand">
            <Image
              src="/melo-logo.png"
              alt="Melo Chat"
              width={42}
              height={42}
            />

            <div>
              <strong>
                Melo Chat
              </strong>

              <small>
                {t(
                  'footer.tagline',
                )}
              </small>
            </div>
          </div>

          <div className="footerLinks">
            <a href="#features">
              {t(
                'nav.features',
              )}
            </a>

            <a href="#partner">
              {t(
                'nav.partner',
              )}
            </a>

            <a href="#safety">
              {t(
                'nav.safety',
              )}
            </a>

            <a href="#download">
              {t(
                'nav.download',
              )}
            </a>
          </div>

          <span className="copyright">
            © 2026 Melo Chat
          </span>
        </div>
      </footer>
    </main>
  );
}