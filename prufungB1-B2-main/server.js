const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');

/*
 * Einfache HTTP‑Serverimplementierung zur Bereitstellung der vorhandenen
 * Prüfungsseiten und neuer Funktionen wie Anmeldung, Abmeldung und
 * geschützten Bereichen. Es wird bewusst kein externes Framework
 * verwendet, damit das Projekt ohne zusätzliche Abhängigkeiten
 * lauffähig bleibt.
 */

const rootDir = __dirname;

// In‑Memory‑Sessionspeicher: ordnet Session‑Tokens zu Benutzerobjekten.
const sessions = {};

// Einfache Benutzerliste: Sie können hier beliebig viele Benutzer
// definieren. Jeder Benutzer verfügt über Benutzername, Passwort und Rolle.
const users = {
  admin: { password: 'admin123', role: 'admin' },
  user:  { password: 'user123',  role: 'user' }
};

/**
 * Parst die Cookies aus dem Request und gibt ein Objekt zurück.
 *
 * @param {http.IncomingMessage} req
 * @returns {Object} key/value Map der Cookies
 */
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    list[name] = value;
  });
  return list;
}

/**
 * Erstellt eine neue Session und gibt das Session‑Token zurück.
 *
 * @param {string} username
 * @returns {string} erzeugter Token
 */
function createSession(username) {
  const token = crypto.randomBytes(16).toString('hex');
  const user = users[username];
  sessions[token] = { username, role: user.role, created: Date.now() };
  return token;
}

/**
 * Liest eine Datei vom Dateisystem und sendet sie an den Client. Wenn
 * erforderlich, wird der MIME‑Type anhand der Endung bestimmt. Bei
 * Fehlern wird ein entsprechender Statuscode und eine Nachricht
 * zurückgegeben.
 *
 * @param {http.ServerResponse} res
 * @param {string} filePath
 * @param {string} [contentType]
 */
function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    let ct = contentType;
    if (!ct) {
      const ext = path.extname(filePath).toLowerCase();
      switch (ext) {
        case '.html': ct = 'text/html; charset=utf-8'; break;
        case '.css':  ct = 'text/css'; break;
        case '.js':   ct = 'application/javascript'; break;
        case '.json': ct = 'application/json'; break;
        case '.png':  ct = 'image/png'; break;
        case '.jpg':  ct = 'image/jpeg'; break;
        case '.woff2':ct = 'font/woff2'; break;
        case '.woff': ct = 'font/woff'; break;
        default:      ct = 'application/octet-stream';
      }
    }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}

/**
 * Prüft, ob der aktuelle Request eine gültige Session besitzt. Ist
 * keine gültige Session vorhanden, wird undefined zurückgegeben.
 *
 * @param {http.IncomingMessage} req
 * @returns {Object|undefined} der Benutzereintrag
 */
function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.session;
  if (!token) return undefined;
  return sessions[token];
}

/**
 * Erzeugt einen Redirect zu einer bestimmten URL.
 *
 * @param {http.ServerResponse} res
 * @param {string} location
 */
function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

/**
 * Handelt eine GET‑Anfrage auf die Loginseite ab. Optional kann ein
 * Fehlercode über die Query‑Parameter übergeben werden, um eine
 * Fehlermeldung auszugeben.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function handleLoginGet(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const error = url.searchParams.get('error');
  const filePath = path.join(rootDir, 'login.html');
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Interner Fehler');
      return;
    }
    const errorMsg = error ? 'Ungültiger Benutzername oder Passwort' : '';
    const html = content.replace('{{error}}', errorMsg);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}

/**
 * Handelt eine POST‑Anfrage zur Anmeldung ab. Erwartet Felder
 * 'username' und 'password' im Request‑Body.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function handleLoginPost(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    // Begrenzung, um Denial‑of‑Service zu verhindern
    if (body.length > 1e6) req.connection.destroy();
  });
  req.on('end', () => {
    const parsed = querystring.parse(body);
    const username = parsed.username || '';
    const password = parsed.password || '';
    const user = users[username];
    if (user && user.password === password) {
      const token = createSession(username);
      // Set cookie; Pfad auf / setzen, damit alle Unterseiten Zugriff haben.
      const cookieHeader = `session=${token}; HttpOnly; Path=/`;
      res.writeHead(302, { 'Location': '/home', 'Set-Cookie': cookieHeader });
      res.end();
    } else {
      // Redirect mit Fehlermeldung
      res.writeHead(302, { Location: '/login?error=1' });
      res.end();
    }
  });
}

/**
 * Handelt eine Abmeldung ab: löscht die Session und entfernt das Cookie.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function handleLogout(req, res) {
  const cookies = parseCookies(req);
  const token = cookies.session;
  if (token && sessions[token]) {
    delete sessions[token];
  }
  // Cookie sofort auslaufen lassen
  res.writeHead(302, {
    'Location': '/login',
    'Set-Cookie': 'session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'
  });
  res.end();
}

/**
 * Sorgt dafür, dass der Benutzer angemeldet ist. Falls nicht, wird
 * automatisch zur Loginseite umgeleitet.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {Object|undefined} Benutzerobjekt oder undefined, wenn
 *   umgeleitet wurde
 */
function requireAuth(req, res) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    redirect(res, '/login');
    return undefined;
  }
  return user;
}

/**
 * Normalisiert eine angeforderte Pfad‑URL und verhindert Directory
 * Traversals. Wird eine Datei außerhalb des Root‑Ordners angefordert,
 * wird false zurückgegeben.
 *
 * @param {string} requestPath
 * @returns {string|false} Normalisierter Pfad oder false
 */
function normalizePath(requestPath) {
  try {
    const decodePath = decodeURIComponent(requestPath);
    const fullPath = path.join(rootDir, decodePath);
    const normalized = path.normalize(fullPath);
    if (!normalized.startsWith(rootDir)) {
      return false;
    }
    return normalized;
  } catch (err) {
    return false;
  }
}

// Erstellung des Servers
const server = http.createServer((req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Heartbeat für den Inaktivitätstimer
  if (pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // Login GET/POST
  if (pathname === '/login') {
    if (method === 'POST') {
      handleLoginPost(req, res);
    } else {
      handleLoginGet(req, res);
    }
    return;
  }

  // Logout GET/POST
  if (pathname === '/logout') {
    handleLogout(req, res);
    return;
  }

  // Jede weitere Route erfordert eine Authentifizierung, außer statische Ressourcen aus FontAwesome.
  // Prüfen, ob Pfad statische Ressourcen darstellt, die keine Anmeldung benötigen
  if (pathname.startsWith('/ajax/libs/font-awesome')) {
    const filePath = normalizePath(pathname);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }
    sendFile(res, filePath);
    return;
  }

  // Die Prüfungsseite ist öffentlich zugänglich; die Anmeldung ist nicht mehr
  // erforderlich, damit der komplette Projektinhalt direkt angezeigt werden kann.
  const user = { username: 'guest', role: 'admin' };

  // Startseite (/ oder /home) -> home.html
  if (pathname === '/' || pathname === '/home') {
    sendFile(res, path.join(rootDir, 'home.html'), 'text/html; charset=utf-8');
    return;
  }

  // Adminbereich
  if (pathname === '/admin') {
    if (user.role === 'admin') {
      sendFile(res, path.join(rootDir, 'admin.html'), 'text/html; charset=utf-8');
    } else {
      redirect(res, '/home');
    }
    return;
  }

  // QUIZESseiten: /QUIZES/XYZ.html => Datei QUIZES/XYZ.html
  if (pathname.startsWith('/QUIZES/')) {
    const fileName = pathname.split('/').pop();
    const filePath = path.join(rootDir, 'QUIZES', fileName);
    sendFile(res, filePath, 'text/html; charset=utf-8');
    return;
  }

  // Alle anderen Dateien: versuche sie direkt auszuliefern
  const filePath = normalizePath(pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }
  // Wenn der Pfad ein Verzeichnis ist, versuche index.html
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      fs.access(indexFile, fs.constants.R_OK, (err2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          sendFile(res, indexFile, 'text/html; charset=utf-8');
        }
      });
    } else {
      sendFile(res, filePath);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});