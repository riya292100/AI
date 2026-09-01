# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* /app/
RUN yarn install --frozen-lockfile || npm install --legacy-peer-deps

COPY frontend /app
ENV REACT_APP_BACKEND_URL=http://localhost:8000
RUN yarn build || npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
