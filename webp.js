const webp = require("node-webpmux")
const {fileTypeFromBuffer} = await import("file-type")
const {readFileSync,writeFileSync,rmSync} = require("fs")

function tgl() {
    const date = new Date()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${hour}:${minute} ${day}/${month}/${year}`
}
async function Img2webp(buffer) {
    const ran = randomBytes(14).toString('hex')
    const {ext} = await fileTypeFromBuffer(buffer)
    const awal = "node_modules/sampah/"+ran+"."+ext
    const akhir = "node_modules/sampah/"+ran+".webp"
    writeFileSync(awal,buffer)
    await execSync(`ffmpeg -y -i ${awal} -vf 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1' ${akhir} && rm -rf ${awal}`, {stdio:"pipe"})
    const baca = readFileSync(akhir)
    rmSync(akhir)
    return baca
}
async function Mp42webp(buffer) {
    const ran = randomBytes(14).toString('hex')
    const {ext} = await fileTypeFromBuffer(buffer)
    const awal = "node_modules/sampah/"+ran+"."+ext
    const akhir = "node_modules/sampah/"+ran+".webp"
    writeFileSync(awal,buffer)
    await execSync(`ffmpeg -i ${awal} -vcodec libwebp -vf "scale='min(320,512)':min'(320,512)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -loop 0 -ss 00:00:00 -t 00:00:05 -preset default -an -vsync 0 ${akhir} && rm -rf ${awal}`, {stdio:"pipe"})
    const baca = readFileSync(akhir)
    rmSync(akhir)
    return baca
}
async function addExif(webpSticker, packname = "Stiker kita", author = new Date().getFullYear(), categories = [''], extra = {}) {
    const img = new webp.Image();
    const alink = 'https://itunes.apple.com/app/sticker-maker-studio/id1443326857';
    const json = {
        "sticker-pack-id": "com.frmdeveloper.sticker",
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "android-app-store-link": "https://play.google.com/store/search?c=apps&q="+encodeURIComponent("Dibuat oleh FRM pada "+tgl()),
        "Ios-app-store-link": alink,
        "emojis": categories,
        ...extra
    };
    let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    let exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker)
    img.exif = exif
    return await img.save(null)
}

return {addExif,Mp42webp,Img2webp}