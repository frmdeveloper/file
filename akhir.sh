if [ ! -d "WAProto" ]; then
  mkdir WAProto
  echo "{}" > WAProto/package.json
fi
rm -rf package-lock.json
echo "Download WAProto..."
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.js' | sed 's/waproto/proto/g' > 'WAProto/index.js'
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/dist/index.d.ts' | sed 's/waproto/proto/g' > 'WAProto/index.d.ts'
curl 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main/WAProto.proto' | sed 's/waproto/proto/g' > 'WAProto/WAProto.proto'