
#include <sys/socket.h>
#include <sys/un.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <arpa/inet.h>

#define STREAM_SERVER_SOCKET_PATH "/tmp/mystreamsocket"
#define DGRAM_SERVER_SOCKET_PATH "/tmp/mydgramsocket"
#define BUFFER_SIZE 256


const char *get_word_at(const char *buf, size_t n, size_t index) {
  int count = 0;
  int i = 0;
  int j = 0;
  while (count <= index) {
    i = j;
    while (i < n && isspace((unsigned char) buf[i])) ++i;
    j = i;
    while (j < n && !isspace((unsigned char) buf[j])) ++j;
    ++count;
  }
  char *res = (char*) malloc(j - i);
  memcpy(res, buf + i, j - i);
  return res;
}

int parse_command(const char *buffer, ssize_t n) {
  const char *arg1 = get_word_at(buffer, n, 0);
  if (strcmp(arg1, "start") == 0) {
    const char *arg2 = get_word_at(buffer, n, 1);
    if (strcmp(arg2, "wa-voip-recording") == 0) {
      start_wa_voip_recording();
    }
  } else if (strcmp(arg1, "stop") == 0) {
    const char *arg2 = get_word_at(buffer, n, 1);
    if (strcmp(arg2, "wa-voip-recording") == 0) {
      stop_wa_voip_recording();
    }
  }
}

int start_stream_server() {
  unlink(STREAM_SERVER_SOCKET_PATH);
  int server_fd = socket(AF_INET, SOCK_STREAM, 0);
  if (server_fd < 0) {
    return -1;
  }
  struct sockaddr_in addr;
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = INADDR_ANY;
  addr.sin_port = htons(5678);
  // strncpy(addr.sun_path, STREAM_SERVER_SOCKET_PATH, sizeof(addr.sun_path) - 1);
  int opt = 1;
  setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
  int ret = bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));
  if (ret < 0) {
    close(server_fd);
    return -2;
  }
  if (listen(server_fd, 10) < 0) {
    close(server_fd);
    return -3;
  }
  printf("Server is ready. Waiting for messages...\n");
  while(1) {
    socklen_t addrlen = sizeof(addr);
    int client_fd = accept(server_fd, (struct sockaddr*)&addr, &addrlen);
    if (client_fd < 0) {
      close(server_fd);
      return -4;
    }
    char buffer[BUFFER_SIZE];
    ssize_t n = read(client_fd, buffer, sizeof(buffer) - 1);
    if (n > 0) {
      printf("Message from client: %s\n", buffer);
      parse_command(buffer, n);
      const char *reply = "Hello! This is agent MCS.";
      write(client_fd, reply, strlen(reply));
    }
    close(client_fd);
  }
  close(server_fd);
  printf("Server closed.\n");
  return 0;
}

int start_dgram_server() {
    unlink(DGRAM_SERVER_SOCKET_PATH);
    int server_fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (server_fd < 0) {
      return -1;
    }
    struct sockaddr_in server_addr;
    char buffer[BUFFER_SIZE];
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(5678);
    // strcpy(server_addr.sun_path, DGRAM_SERVER_SOCKET_PATH);
    if (bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        close(server_fd);
        return -2;
    }
    printf("Server is ready. Waiting for messages...\n");
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);
    while (1) {
      ssize_t bytes = recvfrom(server_fd, buffer, sizeof(buffer) - 1, 0, (struct sockaddr *)&client_addr, &client_len);
      if (bytes < 0) {
        break;
      }
      buffer[bytes] = '\0';
      printf("Message from client: %s\n", buffer);
      const char *reply = "Hello from server!";
      if (sendto(server_fd, reply, strlen(reply), 0, (struct sockaddr *)&client_addr, client_len) < 0) {
        break;
      }
    }
    close(server_fd);
    unlink(DGRAM_SERVER_SOCKET_PATH);
    return 0;
}

int main() {
  // int ret = start_dgram_server();
  int ret = start_stream_server();
  if (ret < 0) {
    printf("ret : %d\n, errno : %d\n", ret, errno);
  }
}
