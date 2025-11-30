#include "wa-voip-recording.h"

#include <stdio.h>
#include <string.h>
#include <ctype.h>

void start_wa_voip_recording() {
  char line[256];
  FILE *fp = popen("./install-wa-hooks.sh", "r");
  if (!fp) {
    return;
  }
  while (fgets(line, sizeof(line), fp)) {
    printf("OUTPUT: %s", line);
  }

  pclose(fp);
}

void stop_wa_voip_recording() {
  return;
}
