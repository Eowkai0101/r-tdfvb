// npm install sonrasi calisir. youtube-dl-exec'in indirdigi yt-dlp binary'sini
// en guncel surume ceker. YouTube formatlarini/korumasini surekli degistirdigi
// icin bu adim onemli. Hata olursa build'i durdurmuyoruz (best-effort).
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const binPath = path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

if (!fs.existsSync(binPath)) {
  console.warn('yt-dlp binary bulunamadi, guncelleme atlaniyor:', binPath);
  process.exit(0);
}

try {
  const output = execFileSync(binPath, ['-U'], { encoding: 'utf-8', timeout: 30000 });
  console.log('yt-dlp guncelleme sonucu:\n', output);
} catch (err) {
  console.warn('yt-dlp guncellenemedi (build devam ediyor):', err.message);
}
