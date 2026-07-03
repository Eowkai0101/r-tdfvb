# yt-stream-api

YouTube video ID'sinden doğrudan **stream URL**'si döndüren küçük bir Node.js API'si.
Dosya indirmez, disk kullanmaz — sadece yt-dlp ile videoyu çözümleyip client'ın (Expo APK)
doğrudan bağlanabileceği bir URL döner. Bu sayede senin sunucun bant genişliği yükü taşımaz.

## Nasıl çalışıyor

```
Expo APK  →  GET /api/resolve/VIDEO_ID  →  API (yt-dlp ile çözümler)  →  { streamUrl, title, ... }
Expo APK  →  streamUrl'den DOĞRUDAN ses çalar (senin sunucun aradan çekilir)
```

## Yerel çalıştırma

```bash
npm install
npm start
# http://localhost:3000
```

## Endpoint'ler

### `GET /api/resolve/:videoId`

Query param: `type=audio` (varsayılan) veya `type=video`

```bash
curl http://localhost:3000/api/resolve/dQw4w9WgXcQ?type=audio
```

Örnek yanıt:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "...",
  "duration": 212,
  "thumbnail": "https://...",
  "uploader": "...",
  "streamUrl": "https://rr---sn-....googlevideo.com/videoplayback?...",
  "ext": "webm",
  "acodec": "opus",
  "abr": 160,
  "cached": false
}
```

`streamUrl` değeri birkaç saat geçerlidir (YouTube tarafında süresi var), bu yüzden
her çalışta yeniden çözümleme gerekir — kalıcı saklama yapma.

### `GET /api/health`

Basit sağlık kontrolü.

## API key koruması (opsiyonel ama önerilir)

Render'da `API_KEY` ortam değişkenini tanımlarsan, tüm `/api/*` istekleri
`x-api-key` header'ı ile korunur:

```bash
curl -H "x-api-key: GIZLI_ANAHTARIN" http://localhost:3000/api/resolve/dQw4w9WgXcQ
```

Bunu tanımlamazsan API key kontrolü otomatik devre dışı kalır (herkese açık olur).
**Public'e attığın bir APK'de API'yi açık bırakmamanı öneririm** — en azından basit
bir key ekle, yoksa herkes senin sunucunu proxy olarak kullanabilir.

## Render'a deploy etme

1. Bu klasörü kendi GitHub reponda bir repoya push et.
2. [render.com](https://render.com) → New → Web Service → GitHub reponu bağla.
3. Ayarlar:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Environment Variables kısmına `API_KEY` ekle (rastgele güçlü bir string).
5. Deploy et. İlk deploy birkaç dakika sürebilir (yt-dlp binary indiriliyor).

> `render.yaml` dosyası da ekli, Render'ın "Blueprint" özelliğiyle otomatik
> tanıyabilir (New → Blueprint → repo seç).

## Render free tier ile ilgili bilmen gerekenler

- 15 dakika istek gelmezse uygulama uyur, ilk istekte 30-60 sn cold start olur.
  APK'de ilk istek için timeout'u en az 60 saniye ayarla veya kullanıcıya
  "yükleniyor" göster.
- Kendi cron job'ın uygulamayı uyanık tutmuyor — istersen UptimeRobot gibi
  dışarıdan bir servisle 10 dakikada bir ping attırabilirsin (opsiyonel,
  zorunlu değil).
- 512MB RAM / 0.1 CPU bu iş için yeterli çünkü ağır iş yapmıyoruz
  (sadece URL çözümleme, dosya indirme/encode yok).

## Expo (React Native) tarafında kullanım örneği

```js
const res = await fetch(`https://SENIN-APIN.onrender.com/api/resolve/${videoId}`, {
  headers: { 'x-api-key': 'GIZLI_ANAHTARIN' },
});
const data = await res.json();

// data.streamUrl ile doğrudan bir audio player'a (expo-av gibi) bağlanabilirsin
import { Audio } from 'expo-av';
const { sound } = await Audio.Sound.createAsync({ uri: data.streamUrl });
await sound.playAsync();
```

## Google Play onayı hakkında not

Bu mimaride APK, YouTube video/ses verisini kendi sunucundan değil, doğrudan
Google'ın googlevideo.com sunucularından çekiyor (senin API sadece URL çözüyor).
Bu, bazı ekstraksiyon kütüphanelerine (NewPipeExtractor vb.) kıyasla daha
"resmi" bir akışa benzese de, YouTube içeriğini indirme/stream etme
politikaları hâlâ geçerli — Play Store incelemesinde reddedilme riski
tamamen ortadan kalkmaz. Uygulamanı gönderirken YouTube ToS ve Play Store
politikalarını gözden geçirmen faydalı olur.
