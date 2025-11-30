
#include <sys/socket.h>
#include <sys/un.h>
#include <string.h>
#include <unistd.h>
#include <stdio.h>
#include <arpa/inet.h>
#include <pthread.h>
#include <errno.h>
#include <stdlib.h>

#define STREAM_SERVER_SOCKET_PATH "/tmp/mystreamsocket"
#define DGRAM_SERVER_SOCKET_PATH "/tmp/mydgramsocket"
#define CLIENT_SOCKET_PATH "/tmp/client_dgram_socket"
#define BUFFER_SIZE 256
// #define SERVER_IP "192.168.1.33"

static char *g_server_ip;
static int g_port;
static char *g_message;

int connect_to_stream_server() {
  int client_fd = socket(AF_INET, SOCK_STREAM, 0);
  if (client_fd < 0) {
    return -1;
  }
  struct sockaddr_in addr;
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_ANY);
  addr.sin_port = htons(g_port);
  // strncpy(addr.sun_path, STREAM_SERVER_SOCKET_PATH, sizeof(STREAM_SERVER_SOCKET_PATH)-1);
  inet_pton(AF_INET, g_server_ip, &addr.sin_addr);
  if (connect(client_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
    printf("mehul.debug connect_to_stream_server errno : %d\n", errno);
    close(client_fd);
    return -2;
  }
  write(client_fd, g_message, strlen(g_message));
  char buffer[BUFFER_SIZE];
  ssize_t n = read(client_fd, buffer, sizeof(buffer)-1);
  if (n > 0) {
    buffer[n] = '\0';
    printf("Responce from server: %s\n", buffer);
  }
  close(client_fd);
  return 0;
}

int connect_to_dgram_server() {
  unlink(CLIENT_SOCKET_PATH);
  int client_fd = socket(AF_INET, SOCK_DGRAM, 0);
  if (client_fd < 0) {
    return -1;
  }
  struct sockaddr_in client_addr;
  char buffer[BUFFER_SIZE];
  memset(&client_addr, 0, sizeof(client_addr));
  client_addr.sin_family = AF_INET;
  client_addr.sin_port = htons(g_port);
  // strcpy(client_addr.sun_path, CLIENT_SOCKET_PATH);
  inet_pton(AF_INET, g_server_ip, &client_addr.sin_addr);
  // if (bind(client_fd, (struct sockaddr *)&client_addr, sizeof(client_addr)) < 0) {
  //   close(client_fd);
  //   return -2;
  // }
  // memset(&server_addr, 0, sizeof(server_addr));
  // server_addr.sun_family = AF_LOCAL;
  // strcpy(server_addr.sun_path, DGRAM_SERVER_SOCKET_PATH);
  if (sendto(client_fd, g_message, strlen(g_message), 0, (struct sockaddr *)&client_addr, sizeof(client_addr)) < 0) {
    close(client_fd);
    return -3;
  }
  printf("Client sent message: %s\n", g_message);
  socklen_t client_len = sizeof(client_addr);
  ssize_t bytes = recvfrom(client_fd, buffer, sizeof(buffer) - 1, 0, (struct sockaddr*)&client_addr, &client_len);
  if (bytes < 0) {
    printf("Error in receiving message from the server");
  } else {
    buffer[bytes] = '\0';
    printf("Received reply from server: %s\n", buffer);
  }
  close(client_fd);
  unlink(CLIENT_SOCKET_PATH);
  return 0;
}

void* stream_thread(void* arg) {
    int result = connect_to_stream_server();
    printf("connect_to_stream_server() returned: %d\n", result);
    return NULL;
}

int main(int argc, char *argv[]) {
  printf("mehul.debug main START\n");
  printf("argc : %d\n", argc);
  if (argc < 4) {
    printf("Insufficient arguments.\n");
    return 1;
  }
  g_server_ip = argv[1];
  g_port = atoi(argv[2]);
  g_message = argv[3];
  printf("Server IP : %s\nPORT : %d\nMessage : %s\n", g_server_ip, g_port, g_message);
  pthread_t tid;
  if (pthread_create(&tid, NULL, stream_thread, NULL) != 0) {
    printf("pthread_create failed");
    return 1;
  }
  pthread_join(tid, NULL);
}
