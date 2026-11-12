FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --chown=node:node package.json index.html ./
COPY --chown=node:node server/ ./server/
COPY --chown=node:node src/ ./src/
ENV NODE_ENV=production DIGI_HOST=0.0.0.0 PORT=3000 DIGI_DB_PATH=/data/condominio.sqlite
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["node", "-e", "const r=require('node:http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health'},x=>{let b='';x.on('data',d=>b+=d);x.on('end',()=>{try{process.exit(x.statusCode===200&&JSON.parse(b).status==='ok'?0:1)}catch{process.exit(1)}})});r.on('error',()=>process.exit(1));r.setTimeout(3000,()=>{r.destroy();process.exit(1)})"]
CMD ["node", "server/hosted-launch.js"]
