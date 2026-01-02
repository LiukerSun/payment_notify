# Use a lean Node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . .

ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]
