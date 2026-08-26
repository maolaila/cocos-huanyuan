'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');

var previewBuildRoot = path.resolve(__dirname, '..', 'build', 'web-mobile');
var previewPort = readPreviewPort(process.argv.slice(2));
var gamePackageMountPath = '/dzpk-955/';
var mimeTypeByExtension = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.bin': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

if (!fs.existsSync(path.join(previewBuildRoot, 'index.html'))) {
  throw new Error('Creator web-mobile build is missing; run scripts/build-creator247.ps1 first');
}

var previewServer = http.createServer(serveStaticRequest);
previewServer.listen(previewPort, '127.0.0.1', function () {
  process.stdout.write(
    'Original DZPK preview: http://127.0.0.1:' + previewPort + '/index.html\n'
  );
});

process.on('SIGINT', closePreviewServer);
process.on('SIGTERM', closePreviewServer);

function serveStaticRequest(httpRequest, httpResponse) {
  var requestUrl = new URL(httpRequest.url, 'http://127.0.0.1:' + previewPort);
  var decodedRequestPath;
  try {
    decodedRequestPath = decodeURIComponent(requestUrl.pathname);
  } catch (pathDecodeFailure) {
    sendPlainText(httpResponse, 400, 'Invalid URL encoding');
    return;
  }
  var packageRelativeRequestPath = decodedRequestPath.indexOf(gamePackageMountPath) === 0
    ? decodedRequestPath.slice(gamePackageMountPath.length)
    : decodedRequestPath.replace(/^\/+/, '');
  var relativeAssetPath = !packageRelativeRequestPath
    ? 'index.html'
    : packageRelativeRequestPath;
  var resolvedAssetPath = path.resolve(previewBuildRoot, relativeAssetPath);
  var allowedAssetPrefix = previewBuildRoot + path.sep;
  if (resolvedAssetPath !== previewBuildRoot && !resolvedAssetPath.startsWith(allowedAssetPrefix)) {
    sendPlainText(httpResponse, 403, 'Asset path is outside the Creator build');
    return;
  }

  fs.stat(resolvedAssetPath, function (assetStatFailure, assetStatistics) {
    if (assetStatFailure || !assetStatistics.isFile()) {
      sendPlainText(httpResponse, 404, 'Asset not found');
      return;
    }
    var assetExtension = path.extname(resolvedAssetPath).toLowerCase();
    httpResponse.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mimeTypeByExtension[assetExtension] || 'application/octet-stream'
    });
    fs.createReadStream(resolvedAssetPath).pipe(httpResponse);
  });
}

function sendPlainText(httpResponse, statusCode, messageText) {
  httpResponse.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'text/plain; charset=utf-8'
  });
  httpResponse.end(messageText);
}

function readPreviewPort(commandArguments) {
  var portArgumentIndex = commandArguments.indexOf('--port');
  var requestedPort = portArgumentIndex >= 0
    ? Number(commandArguments[portArgumentIndex + 1])
    : 17419;
  if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
    throw new Error('Preview port must be an integer between 1024 and 65535');
  }
  return requestedPort;
}

function closePreviewServer() {
  previewServer.close(function () {
    process.exit(0);
  });
}
