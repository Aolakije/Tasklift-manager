FROM golang:1.24.5-alpine

LABEL maintainer="Aolakije"
LABEL version="1.0"
LABEL description="Task Lift Manager"

# Enable CGO and set required env
ENV CGO_ENABLED=1 \
    GOOS=linux \
    GOARCH=amd64

# Install build tools and SQLite dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY . .

# Build Go app with CGO support
RUN go build -o taskmanager

EXPOSE 5050

CMD ["./taskmanager"]
