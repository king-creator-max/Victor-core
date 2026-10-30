FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY cloud_server.mjs ./
EXPOSE 8080
CMD ["node", "cloud_server.mjs"]
