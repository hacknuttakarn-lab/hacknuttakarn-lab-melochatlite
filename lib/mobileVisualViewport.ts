'use client';

/**
 * Keep full-screen mobile chat surfaces attached to the *visual* viewport.
 * iOS Safari/WebView can pan the layout viewport when the keyboard opens,
 * which otherwise moves the conversation header above the visible screen.
 */
export function bindMobileVisualViewport(
  prefix: string,
  normalBottomReserve = '0px',
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined;
  }

  const root = document.documentElement;
  const heightVar = `--${prefix}-vv-height`;
  const topVar = `--${prefix}-vv-top`;
  const bottomVar = `--${prefix}-bottom-reserve`;
  const viewport = window.visualViewport;

  let frame = 0;
  let settleTimer = 0;

  const updateNow = () => {
    const visualHeight = viewport?.height ?? window.innerHeight;
    const layoutHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
    );
    const visualTop = Math.max(0, viewport?.offsetTop ?? 0);
    const obscured = Math.max(0, layoutHeight - visualHeight - visualTop);
    const keyboardOpen = Boolean(
      viewport && (
        obscured > 90 ||
        visualHeight < layoutHeight * 0.82
      ),
    );
    const height = Math.max(1, Math.round(visualHeight));

    // Only follow the visual viewport pan while a software keyboard is open.
    // This avoids the large blank top band that iOS standalone mode can report
    // from a persistent safe-area offset while the keyboard is closed.
    const top = keyboardOpen
      ? Math.max(0, Math.round(visualTop))
      : 0;

    root.style.setProperty(heightVar, `${height}px`);
    root.style.setProperty(topVar, `${top}px`);
    root.style.setProperty(bottomVar, keyboardOpen ? '0px' : normalBottomReserve);
  };

  const scheduleUpdate = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(updateNow);

    // Safari emits several intermediate viewport sizes during the keyboard
    // animation. Re-read once after it settles so the drawer cannot remain at
    // a transient height/offset.
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(updateNow, 180);
  };

  updateNow();
  viewport?.addEventListener('resize', scheduleUpdate);
  viewport?.addEventListener('scroll', scheduleUpdate);
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(settleTimer);
    viewport?.removeEventListener('resize', scheduleUpdate);
    viewport?.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    window.removeEventListener('orientationchange', scheduleUpdate);
    root.style.removeProperty(heightVar);
    root.style.removeProperty(topVar);
    root.style.removeProperty(bottomVar);
  };
}
