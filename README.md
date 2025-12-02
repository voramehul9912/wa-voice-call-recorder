
# wa-voice-call-recorder  
This project is created to record the voice call from WhatsApp  
  
# Prerequisites  
  1. Magisk rooted device  
  2. Machine with   
    1. frida-tools (16.7.9 in my case)  
    2. cmake (3.22.1 in my case),   
    3. android-ndk (21.4.7075529 in my case)  
    4. adb  
    5. zip

# Steps to build the agent-mcs Executable for your Android device  
  1. Go to /wa-voice-call-recorder/agent-mcs/core directory
  2. Update /wa-voice-call-recorder/agent-mcs/core/CMakeLists.txt
  3. Update ANDROID_HOME variable to point to your Android sdk ($HOME/Library/Android/sdk in my case)
  4. Update NDK_VERSION according to your installed NDK version (21.4.7075529 in my case)
  5. Update CMAKE_C_COMPILER to point to the correct clang executable (For the target Android device)
  6. Update CMAKE_CXX_COMPILER to point to the correct clang++ executable (For the target Android device)
  7. Update CMAKE_ANDROID_ARCH_ABI according to your android device's ABI
  8. Create a folder named `build`
  9. Go to /wa-voice-call-recorder/agent-mcs/core/build
  10. run `cmake ..`
  11. run `cmake --build .`
  12. Check whether an executable named agent-mcs is created or not  

# Steps to build the client  
  1. Go to /wa-voice-call-recorder/client directory  
  2. Execute : clang client.c -o client (in case of Mac)
  3. Execute : gcc client.c -o client (in case of Linux)

# Steps to build the Magisk module agent-mcs.zip for the Agent  
  1. Copy the agent-mcs executable to /wa-voice-call-recorder/agent-mcs/magisk-module/system/bin folder  
  2. Find out the frida-server executable for you Android device  
  3. Put it inside /wa-voice-call-recorder/agent-mcs/magisk-module/system/bin/ folder
  4. Update the script /wa-voice-call-recorder/agent-mcs/magisk-module/service.sh with your frida-server file  
  5. Go to /wa-voice-call-recorder/agent-mcs/magisk-module
  6. Execute `zip -r ../agent-mcs.zip .`

# Steps to install the Magisk module agent-mcs.zip  
  1. Push the agent-mcs.zip file to the Android device's storage (say /sdcard/)  
  2. Use this command to install the module : `adb shell su -c magisk --install-module /sdcard/agent-mcs.zip`  
  3. Reboot the device  

# Steps to talk to the Agent  
  1. Build the agent-mcs executable for your Android device  
  2. Build the client for your machine (Linux/Mac/Windows)  
  3. Build and install the Magisk module using agent-mcs executable  
  4. Connect the Android device with the client Machine using USB (Make sure adb commands run)  
  5. Make sure both machines are connected to the same network  
  6. Get the ip address of the Android device  
  7. Run the client executable like this : ./client ip-address port message  

# Steps to record the WhatsApp voice call  
  1. Install the Magisk module agent-mcs.zip that you created  
  2. Connect the Android device using USB cable with the frida-tools installed machine  
  3. Run `adb devices` and note down the device id  
  4. Run the script wh-hijack.js using the following command  
     - `frida --device=<device-id> -f com.whatsapp -l wh-hijack.js`  
  12. Start the voice call  
  13. Talk  
  14. End the voice call  
  15. The recording file will be created inside /data/data/com.whatsapp/cache/voip folder  
    - The file name should be like : {random-string}-{date-time}  
  16. Copy that file manually using `adb pull` command to your Linux/Mac/Windows machine  

