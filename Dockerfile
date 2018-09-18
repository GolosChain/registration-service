FROM node:8
WORKDIR /usr/src/app
COPY ./package*.json ./legacy-phones.csv* ./
RUN npm install --only=production
COPY ./src/ ./src
CMD [ "node", "./src/index.js" ]
