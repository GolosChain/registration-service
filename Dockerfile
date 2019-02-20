FROM node:10-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./legacy-phones.csv* .npmrc ./
RUN npm install --only=production
COPY ./src/ ./src
CMD [ "node", "./src/index.js" ]
