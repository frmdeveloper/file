export const terima = async(conn, m) => {
    if (!conn || !m) return {}
    if (m.key.id.endsWith("-FRM") && m.key.id.length === 32) return
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
        if (m?.message?.messageContextInfo) delete m.message.messageContextInfo
        if (m?.message?.senderKeyDistributionMessage) delete m.message.senderKeyDistributionMessage
        m.message = m.message.viewOnceMessageV2?.message ||
            m.message.documentWithCaptionMessage?.message ||
            m.message.editedMessage?.message?.protocolMessage?.editedMessage ||
            m.message 
        let mtype = Object.keys(m.message)
        msg.type = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype[0]) && mtype[0]) || (mtype.length >= 3 && mtype[1] !== 'messageContextInfo' && mtype[1]) || mtype[mtype.length - 1]
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
        msg.quoted.text = isi.caption || isi.text || isi.message?.documentMessage?.caption || isi
        msg.quoted.mentionedJid = quoted[type].contextInfo?.mentionedJid
        msg.quoted.full = quoted
    }
    return msg
}
