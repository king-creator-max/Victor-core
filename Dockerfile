FROM node:20-alpine

# Install native Linux Chromium + essential rendering fonts & libraries
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use the native OS Chromium binary instead of downloading
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY cloud_server.mjs ./

EXPOSE 8080
CMD ["node", "cloud_server.mjs"]
