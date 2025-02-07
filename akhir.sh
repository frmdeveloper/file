if [ ! -d "WAProto" ]; then
  mkdir WAProto
  echo "{}" > WAProto/package.json
fi
rm -rf package-lock.json
curl -s 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.js' | sed 's/waproto/proto/g' > 'WAProto/index.js'
curl -s 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.d.ts' | sed 's/waproto/proto/g' > 'WAProto/index.d.ts'
curl -s 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/WAProto.proto' | sed 's/waproto/proto/g' > 'WAProto/WAProto.proto'
