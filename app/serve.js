// Minimal static server: node serve.js  →  http://localhost:5173
const http = require("http"), fs = require("fs"), path = require("path");
const root = __dirname, port = +process.env.PORT || 5173;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^([\\/]\.\.)+/, "");
  const file = path.join(root, p === path.sep || p === "/" ? "index.html" : p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(port, () => console.log("Chameleon running at http://localhost:" + port));
