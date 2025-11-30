
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
  
# Steps to record the WhatsApp voice call  
  1. Find out the frida-server executable for you Android device  
  2. Put it inside /wa-voice-call-recorder/agent-mcs/magisk-module/system/bin/ folder  
  3. Update the script /wa-voice-call-recorder/agent-mcs/magisk-module/service.sh with your frida-server file  
  4. Build the executable agent-mcs  
    - Go to /wa-voice-call-recorder/agent-mcs/core directory  
    - Update /wa-voice-call-recorder/agent-mcs/core/CMakeLists.txt  
    - Update ANDROID_HOME variable to point to your Android sdk ($HOME/Library/Android/sdk in my case)  
    - Update NDK_VERSION according to your installed NDK version (21.4.7075529 in my case)  
    - Update CMAKE_C_COMPILER to point to the correct clang executable  
    - Update CMAKE_CXX_COMPILER to point to the correct clang++ executable  
    - Update CMAKE_ANDROID_ARCH_ABI according to your android device's ABI  
    - Create a folder named `build`  
    - Go to /wa-voice-call-recorder/agent-mcs/core/build  
    - run `cmake ..`  
    - run `cmake --build .`  
    - Check whether an executable named agent-mcs is created or not  
  5. Copy the executable agent-mcs to /wa-voice-call-recorder/agent-mcs/magisk-module/system/bin/ folder  
  6. Build the magisk module  
    - Go to /wa-voice-call-recorder/agent-mcs/magisk-module  
    - Execute `zip -r ../agent-mcs.zip .`  
  7. Install the created agent-mcs.zip  
    - Execute `adb push /wa-voice-call-recorder/agent-mcs/agent-mcs.zip /sdcard/Download`  
    - Execute `adb shell su -c magisk --install-module /sdcard/Download/agent-mcs.zip`  
  8. Reboot the Android device.  
  9. Connect the Android device using USB cable with the frida-tools installed machine  
  10. Run `adb devices` and note down the device id   
  11. Run the script wh-hijack.js using the following command  
    - Execute `frida --device=<device-id> -f com.whatsapp -l wh-hijack.js`  
  12. Start the voice call  
  13. Talk  
  14. End the voice call  
  15. The recording file will be created inside /data/data/com.whatsapp/cache/voip folder  
    - The file name should be like : {random-string}-{date-time}  
  16. Copy that file manually using `adb pull` command to your Linux/Mac/Windows machine  

