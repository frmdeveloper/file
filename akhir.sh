rm -rf package-lock.json
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.js' | sed 's/waproto/proto/g' > 'node_modules/@whiskeysockets/baileys/WAProto/index.js'
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.d.ts' | sed 's/waproto/proto/g' > 'node_modules/@whiskeysockets/baileys/WAProto/index.d.ts'
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/WAProto.proto' | sed 's/waproto/proto/g' > 'node_modules/@whiskeysockets/baileys/WAProto/WAProto.proto'
