let baileys,pino
export default (obj) => ({baileys,pino} = obj)
 
const decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = baileys.jidDecode(jid) || {}
      return decode.user && decode.server && decode.user + "@" + decode.server || jid
    } else return jid
}
const download = async (message, type) => {
    if (!message) throw new Error("empty")
    delete message["senderKeyDistributionMessage"]; delete message["messageContextInfo"]
    let tipe = Object.keys(message)[0]
    if (Object.keys(message)?.includes("viewOnceMessageV2")) {
        tipe = Object.keys(message.viewOnceMessageV2.message)[0]
        message = message.viewOnceMessageV2.message
    }
    const stream = await baileys.downloadContentFromMessage(message[tipe], type || tipe.replace(/Message/gi, ""))
    let buffer = Buffer.from([])
    for await(const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}

export async function mulai(nomor,callback) {
    if (!nomor) throw new ReferenceError("number ?")
    if (!callback) throw new ReferenceError("callback ?")
    const { state, saveCreds } = await baileys.useMultiFileAuthState("./whatsapp/sesi_"+nomor)
    const store = baileys.makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) })
    const { version } = await baileys.fetchLatestBaileysVersion()
    const conn = await baileys.makeWASocket({
        version, auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Linux", "Chrome", ""],
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg.message || undefined
            }
            return {conversation: "hah"}
        }
    })
    conn.decodeJid = decodeJid
    conn.download = download
    store.bind(conn.ev)
    if(!conn.authState.creds.registered) {
        await conn.waitForConnectionUpdate((update) => update.qr)
        const kode = await conn.requestPairingCode(nomor)
        console.log(nomor+" > "+kode?.match(/.{1,4}/g)?.join("-") || nomor+" > "+kode)
    }
    async function connectionUpdate({ connection, lastDisconnect }) {
      if (connection === "open") {
        await conn.sendPresenceUpdate("unavailable")
        console.log(nomor+" > Tersambung")
        conn.user.anu = decodeJid(conn.user.id)
      }
      if (connection === "close") {
         const r = lastDisconnect?.error?.output?.statusCode
         const d = baileys.DisconnectReason
         if (r == d.badSession) { console.log(nomor+" > Sesi Buruk"); } 
         if (r == d.connectionClosed) { console.log(nomor+" > Koneksi Tertutup"); await mulai(nomor,callback); } 
         if (r == d.connectionLost) { console.log(nomor+" > Koneksi Hilang"); await mulai(nomor,callback); } 
         if (r == d.connectionReplaced) { console.log(nomor+" > Koneksi tertimpa"); } 
         if (r == d.loggedOut) { console.log(nomor+" > Perangkat di logout"); } //rmSync("whatsapp/sesi_"+nomor, {recursive:true});
         if (r == d.restartRequired) { console.log(nomor+" > Memulai ulang"); await mulai(nomor,callback); } 
         if (r == d.timedOut) { console.log(nomor+" > Waktu habis"); } //await mulai(nomor,callback);
         if (r == d.multideviceMismatch) { console.log(nomor+" > Gk cocok"); } 
      }
    }
    conn.ev.process(
        async(events) => {
            if(events["connection.update"]) await connectionUpdate(events["connection.update"])
            if(events["presence.update"]) await conn.sendPresenceUpdate("unavailable")
            if(events["creds.update"]) await saveCreds()
            if(events["messages.upsert"]) {
                if (events["messages.upsert"]?.type != "notify") return
                console.log(JSON.stringify(events["messages.upsert"],0,2))
                for (const msg of events["messages.upsert"].messages) {
                  if (!msg) return
                  if (!msg.key) return
                  if (msg.key.remoteJid == "status@broadcast") return //await conn.readMessages([msg.key])
                  if (conn.user.id.includes(msg.message?.orderMessage?.sellerJid?.split("@")[0])) return conn.sendMessage(msg.key.remoteJid, {sticker: {url:"./bantuan/obtained.webp"}}, {quoted:msg})
                  msg.gw = conn.user.anu
                  await callback(conn,msg)
                }
            }
        }
    )
    conn.profilePictureUrl = async(jid, type = 'preview', timeoutMs) => {
        jid = baileys.jidNormalizedUser(jid)
        const result = await conn.query({
            tag: 'iq',
            attrs: {
                target: jid,
                to: "@s.whatsapp.net",
                type: 'get',
                xmlns: 'w:profile:picture'
            },
            content: [
                { tag: 'picture', attrs: { type, query: 'url' } }
            ]
        }, timeoutMs)
        const child = baileys.getBinaryNodeChild(result, 'picture')
        return child?.attrs?.url
    }
}