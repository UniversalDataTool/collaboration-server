FROM node:latest

WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install -g micro
RUN npm install

# Copy app source code
COPY . /usr/src/app

#Expose port and start application
CMD [ "npm", "start" ]
EXPOSE 3000
