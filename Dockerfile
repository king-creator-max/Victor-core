FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install
COPY cloud_server.mjs ./
EXPOSE 8080
ENV PORT=8080
CMD ["npm", "start"]
