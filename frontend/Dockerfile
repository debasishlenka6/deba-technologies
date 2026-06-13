FROM nginx:alpine
RUN apk upgrade --no-cache
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/
COPY ../nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost || exit 1
CMD ["nginx", "-g", "daemon off;"]
