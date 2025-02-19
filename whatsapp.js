/*require("../node_modules/@whiskeysockets/baileys/lib/Utils/generics.js").generateMessageID = () => {
    return require('crypto').randomBytes(14).toString('hex').toUpperCase() + '-FRM'
}*/
function isUrl(str) {
  try {
    new URL(str)
    return true
  } catch (e) {
    return false
  }
}
const decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = baileys.jidDecode(jid) || {}
      return decode.user && decode.server && decode.user + "@" + decode.server || jid
    } else return jid
}
async function mulai(nomor) {
    if (!nomor) return
    const { state, saveCreds } = await baileys.useMultiFileAuthState("./sesi_"+nomor)
    const store = baileys.makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) })
    const { version } = await baileys.fetchLatestBaileysVersion()
    const conn =  await tambahan(baileys.makeWASocket({
        version, auth: state,
        connectTimeoutMs: 300000,
        logger: pino({ level: "silent" }),
        browser: ["Windows", "Firefox", ""],
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg.message || undefined
            }
            return {conversation: "hah"}
        }
    }))
    conn.browser = ["Windows", "Firefox", ""]
    store.bind(conn.ev)
    if(!conn.authState.creds.registered) {
        await conn.waitForConnectionUpdate((update) => update.qr)
        const kode = await conn.requestPairingCode(nomor, "00000000")
        console.log(nomor+" > "+kode?.match(/.{1,4}/g)?.join("-") || nomor+" > "+kode)
    }
    async function connectionUpdate({ connection, lastDisconnect }) {
      if (connection === "open") {
        await conn.sendPresenceUpdate("unavailable")
        console.log(nomor+" > Tersambung")
        owner.push(decodeJid(conn.user.id))
      }
      if (connection === "close") {
         const r = lastDisconnect?.error?.output?.statusCode
         const d = baileys.DisconnectReason
         if (r == d.badSession) console.log(nomor+" > Sesi Buruk")
         if (r == d.connectionClosed) console.log(nomor+" > Koneksi Tertutup")
         if (r == d.connectionLost) console.log(nomor+" > Koneksi Hilang")
         if (r == d.connectionReplaced) return process.exit(200) //console.log(nomor+" > Koneksi tertimpa")
         if (r == d.loggedOut) console.log(nomor+" > Perangkat di logout") //rmSync("whatsapp/sesi_"+nomor, {recursive:true});
         if (r == d.restartRequired) console.log(nomor+" > Memulai ulang")
         if (r == d.timedOut) console.log(nomor+" > Waktu habis...")
         if (r == d.multideviceMismatch) console.log(nomor+" > Gk cocok")
         await mulai(nomor)
      }
    }
    conn.ev.process(
        async(events) => {
            if (events["connection.update"]) await connectionUpdate(events["connection.update"])
            if (events["presence.update"]) await conn.sendPresenceUpdate("unavailable")
            if (events["creds.update"]) await saveCreds()
            if (events["messages.upsert"]?.type == "notify") {
                for (const msg of events["messages.upsert"].messages) {
                  if (!msg && !msg.key) return
                  //if (msg.key.remoteJid == "status@broadcast") return await conn.readMessages([msg.key])
                  await fitur(conn,await terima(conn,msg))
                }
            }
        }
    )
}

const terima = async(conn, m) => {
    if (!conn || !m) return {}
    if (m.key.id.startsWith("FRM0") && m.key.id.length === 32) return
    if (m.key.id.startsWith("3EB0") && m.key.id.length === 12) return
    if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return
    const msg = {}
    msg.full = m
    if (m.key) {
        msg.key = m.key
        msg.id = m.key.id
        msg.from = m.key.remoteJid
        msg.fromMe = m.key.fromMe
        msg.isGroup = msg.from.endsWith('@g.us')
        msg.sender = msg.fromMe ? conn.decodeJid(conn.user.id) : (m.key.participant || m.key.remoteJid)
        msg.pushname = m.pushName
    }
    if (m.message) {
        m.message = m.message.viewOnceMessageV2?.message ||
            m.message.documentWithCaptionMessage?.message ||
            m.message.editedMessage?.message?.protocolMessage?.editedMessage ||
            m.message 
        msg.type = baileys.getContentType(m.message)
        msg.msg = m.message[msg.type]
        msg.text = m.message.conversation || msg.msg?.text || msg.msg?.caption || msg.msg?.selectedId || ''
        const terpusah = /^(#|\!|\/|\.)( +)/.test(msg.text)
        if (terpusah) msg.text = msg.text.replace(" ", "")
        msg.args = msg.text?.trim().split(/ +/).slice(1)
        msg.prefix = /^[!#%./\\]/.test(msg.text) ? msg.text.match(/^[!#%./\\]/gi) : ''
        msg.command = msg.text?.slice(0).trim().split(/ +/).shift().toLowerCase()
        msg.q = msg.args?.join(" ")
        msg.mentionedJid = msg.msg && msg.msg.contextInfo && msg.msg.contextInfo.mentionedJid && msg.msg.contextInfo.mentionedJid.length && msg.msg.contextInfo.mentionedJid || []
    }
    let quoted = msg?.msg?.contextInfo?.quotedMessage
    msg.quoted = {}
    if (quoted) {
        quoted = quoted.groupMentionedMessage?.message || quoted
        let type = Object.keys(quoted)[0]
        const isi = quoted[type]
        msg.quoted.type = type
        msg.quoted.from = conn.decodeJid(msg.msg.contextInfo.remoteJid || msg.from || msg.sender)
        msg.quoted.id = msg.msg.contextInfo.stanzaId
        msg.quoted.sender = conn.decodeJid(msg.msg.contextInfo.participant)
        msg.quoted.fromMe = msg.quoted.sender === (conn.user && conn.user.jid)
        msg.quoted.key = {remoteJid: msg.quoted.from, id: msg.quoted.id, fromMe: msg.quoted.fromMe, participant: msg.quoted.sender}
        msg.quoted.text = isi?.caption || isi?.text || isi?.message?.documentMessage?.caption || isi || ""
        msg.quoted.mentionedJid = quoted[type]?.contextInfo?.mentionedJid
        msg.quoted.groupMentions = quoted[type]?.contextInfo?.groupMentions
        msg.quoted.full = quoted
    }
    return msg
}

async function tambahan(conn) {
	conn.text = async(m,text) => conn.sendMessage(m.from, {text}, {quoted:m.full})
	conn.sticker = async(m,stk) => conn.sendMessage(m.from, {sticker:Buffer.isBuffer(stk) ? stk : isUrl(stk) ? {url:stk} : null}, {quoted:m.full})
	conn.image = async(m,img,caption) => conn.sendMessage(m.from, {caption,image:Buffer.isBuffer(img) ? img : isUrl(img) ? {url:img} : null}, {quoted:m.full})
	conn.video = async(m,vid,caption) => conn.sendMessage(m.from, {caption,video:Buffer.isBuffer(vid) ? vid : isUrl(vid) ? {url:vid} : null}, {quoted:m.full})
	conn.audio = async(m,aud,mime) => conn.sendMessage(m.from, {mimetype,audio:Buffer.isBuffer(aud) ? aud : isUrl(aud) ? {url:aud} : null}, {quoted:m.full})
	conn.requestPairingCode = async (phoneNumber,code) => {
        conn.authState.creds.pairingCode = code
        conn.authState.creds.me = {
            id: baileys.jidEncode(phoneNumber, 's.whatsapp.net'),
            name: '~'
        };
        conn.ev.emit('creds.update', conn.authState.creds);
        await conn.sendNode({
            tag: 'iq',
            attrs: {
                to: baileys.S_WHATSAPP_NET,
                type: 'set',
                id: conn.generateMessageTag(),
                xmlns: 'md'
            },
            content: [{
                tag: 'link_code_companion_reg',
                attrs: {
                    jid: conn.authState.creds.me.id,
                    stage: 'companion_hello',
                    should_show_push_notification: 'true'
                },
                content: [
                    {
                        tag: 'link_code_pairing_wrapped_companion_ephemeral_pub',
                        attrs: {},
                        content: await generatePairingKey()
                    },
                    {
                        tag: 'companion_server_auth_key_pub',
                        attrs: {},
                        content: conn.authState.creds.noiseKey.public
                    },
                    {
                        tag: 'companion_platform_id',
                        attrs: {},
                        content: baileys.getPlatformId(conn.browser[1])
                    },
                    {
                        tag: 'companion_platform_display',
                        attrs: {},
                        content: `${conn.browser[1]} (${conn.browser[0]})`
                    },
                    {
                        tag: 'link_code_pairing_nonce',
                        attrs: {},
                        content: '0'
                    }
                ]
            }]
        });
        return conn.authState.creds.pairingCode
    }

    async function generatePairingKey() {
        const salt = randomBytes(32);
        const randomIv = randomBytes(16);
        const key = await baileys.derivePairingCodeKey(conn.authState.creds.pairingCode, salt);
        const ciphered = baileys.aesEncryptCTR(conn.authState.creds.pairingEphemeralKeyPair.public, key, randomIv);
        return Buffer.concat([salt, randomIv, ciphered]);
    }
    conn.download = async (message, type) => {
    	if (!message) throw new Error("empty")
        let tipe = baileys.getContentType(message)
        if (Object.keys(message)?.includes("viewOnceMessageV2")) {
            tipe = baileys.getContentType(message.viewOnceMessageV2.message)
            message = message.viewOnceMessageV2.message
        }
        const stream = await baileys.downloadContentFromMessage(message[tipe], type || tipe.replace(/Message/gi, ""))
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }
    conn.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
          let decode = baileys.jidDecode(jid) || {}
          return decode.user && decode.server && decode.user + "@" + decode.server || jid
      } else return jid
    }
    conn.contoh = async(hah,m,han) => {
      if (Array.isArray(hah) && hah.length == 2) return await conn.sendMessage(m.from, {text:"`Informasi`\n    "+hah[0]+"\n\n`Contoh`\n    "+m.command+" "+hah[1]}, {quoted:m.full})
      conn.sendMessage(m.from, {image:{url:"bantuan/contoh/"+hah},caption:"Contoh ada di foto"+(han||""),jpegThumbnail:""}, {quoted:m.full})
    }
    conn.ex = (iki,m) => {
        //gini contohnya"+String.fromCharCode(8206).repeat(4001)+"\n"+iki.contoh+"\n(Tutorial hanya intinya)
        return conn.sendMessage(m.from, {text:"Gak gitu njir"}, {quoted:m.full})
    }
    conn.fotoakeh = async(urls,m,capt1,capt2) => {
      async function upload(url) {
        const {data} = await axios.get(url, {responseType:"arraybuffer"})
        const {mime} = await fileTypeFromBuffer(data)
        console.log(mime.split("/")[0])
        return baileys.generateWAMessageContent({[mime.split("/")[0]]:data /*jpegThumbnail:""*/}, {upload:conn.waUploadToServer}) 
      }
      const cards = []
      for (const uh of urls) {
        try {
        const terup = await upload(uh)
        const t = Object.keys(terup)[0]
        cards.push({
          header: {hasMediaAttachment:true, [t]:terup[t]},
          nativeFlowMessage: {}
        })
        } catch {}
      }
      const {message,key} = baileys.generateWAMessageFromContent(m.from, {
        interactiveMessage: {
          body: {text: capt1 || "Jika foto tidak masuk galeri"},
          footer: {text: capt2 || "- buka fotonya > titik 3 > simpan\n- Atau cari di folder Penyimpanan internal > WhatsApp > Media"},
          carouselMessage: {cards}
        }
      }, {quoted:m.full})
      return conn.relayMessage(key.remoteJid, {viewOnceMessage:{message}}, {messageId:key.id})
    }
    return conn
}
return mulai
