/**
 * Service worker do Painel de Gestão.
 *
 * Objetivo: abrir instantaneamente e continuar funcionando sem internet.
 * A página é servida da rede quando dá, e do cache quando não dá — assim
 * uma versão nova chega sozinha, mas o avião não derruba o painel.
 *
 * Os dados do usuário NÃO passam por aqui: eles moram no localStorage e
 * no GitHub. As chamadas à API do GitHub nunca são cacheadas, para não
 * servir dado velho como se fosse atual.
 */

const CACHE = "painel-gestao-v2";
const ESSENCIAIS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ESSENCIAIS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Dados vivos: sempre da rede, nunca do cache.
  if (url.hostname === "api.github.com") return;
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    fetch(req)
      .then((resposta) => {
        // Guarda a cópia mais recente para o próximo carregamento offline.
        const clone = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
        return resposta;
      })
      .catch(async () => {
        const doCache = await caches.match(req);
        if (doCache) return doCache;
        // Navegação sem rede e sem cache exato: devolve o shell do app.
        if (req.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return new Response("Sem conexão e sem cópia local.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
