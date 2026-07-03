const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 3000;

// Basit API key korumasi (istersen Render ortam degiskeni olarak API_KEY tanimla)
const API_KEY = process.env.API_KEY || null;

// Sonuclari 20 dakika cache'liyoruz, ayni video icin tekrar tekrar yt-dlp calistirmamak icin
// (Not: cozulen stream URL'lerinin YouTube tarafinda kendi suresi var, genelde birkac saat gecerli)
const cache = new NodeCache({ stdTTL: 60 * 20 });

app.use(cors());
app.use(express.json());

// Ucretsiz Render plani icin kaynaklari korumak amacli rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // IP basina dakikada 30 istek
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Cok fazla istek gonderildi, biraz sonra tekrar dene.' },
});
app.use('/api/', limiter);

// API key kontrolu (API_KEY tanimliysa header zorunlu olur)
function checkApiKey(req, res, next) {
  if (!API_KEY) return next(); // key tanimlanmadiysa kontrolu atla
  const providedKey = req.header('x-api-key');
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Gecersiz veya eksik API key' });
  }
  next();
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'yt-stream-api calisiyor' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// videoId ile YouTube video/audio stream bilgisini cozumler
// ornek: GET /api/resolve/dQw4w9WgXcQ?type=audio
app.get('/api/resolve/:videoId', checkApiKey, async (req, res) => {
  const { videoId } = req.params;
  const type = req.query.type === 'video' ? 'video' : 'audio'; // varsayilan: audio

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Gecersiz videoId' });
  }

  const cacheKey = `${videoId}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const format = type === 'audio' ? 'bestaudio/best' : 'best';

    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      format,
      noPlaylist: true,
    });

    const result = {
      videoId,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      streamUrl: info.url, // direkt googlevideo.com stream URL'si
      ext: info.ext,
      acodec: info.acodec,
      abr: info.abr, // audio bitrate
    };

    cache.set(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err) {
    console.error(`Cozumleme hatasi (${videoId}):`, err.message);
    res.status(502).json({
      error: 'Video cozumlenemedi',
      detail: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`yt-stream-api ${PORT} portunda calisiyor`);
});
