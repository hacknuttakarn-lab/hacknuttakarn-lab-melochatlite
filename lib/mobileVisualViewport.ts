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

  const update = () => {
    const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
    const top = Math.max(0, Math.round(viewport?.offsetTop ?? 0));
    const keyboardOpen = Boolean(
      viewport && window.innerHeight - viewport.height > 120,
    );

    root.style.setProperty(heightVar, `${height}px`);
    root.style.setProperty(topVar, `${top}px`);
    root.style.setProperty(bottomVar, keyboardOpen ? '0px' : normalBottomReserve);
  };

  update();
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);

  return () => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    root.style.removeProperty(heightVar);
    root.style.removeProperty(topVar);
    root.style.removeProperty(bottomVar);
  };
}
