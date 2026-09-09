/* Melo Web desktop notification service worker - 2026-08-31 */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const href = typeof data.href === "string" && data.href ? data.href : "/";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then(async (clients) => {
      const targetUrl = new URL(href, self.location.origin).href;

      for (const client of clients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin !== self.location.origin) continue;

          if ("focus" in client) {
            await client.focus();
          }

          if (href !== "/" && "navigate" in client) {
            await client.navigate(targetUrl);
          }

          return;
        } catch {
          // Try another client.
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    }),
  );
});
