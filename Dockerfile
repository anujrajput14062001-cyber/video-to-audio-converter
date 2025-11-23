FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads output
EXPOSE 5000
CMD ["npm","start"]
