FROM node:12

WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
COPY . /usr/src/app

RUN yarn install

#Expose port and start application
CMD [ "yarn", "start:prod" ]
EXPOSE 3000
