cmake_minimum_required(VERSION 3.22.1)

project("agent-mcs")

set(ANDROID_HOME $ENV{ANDROID_HOME})
set(NDK_VERSION 21.4.7075529)

set(CMAKE_C_COMPILER ${ANDROID_HOME}/ndk/${NDK_VERSION}/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android21-clang)
set(CMAKE_CXX_COMPILER ${ANDROID_HOME}/ndk/${NDK_VERSION}/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android21-clang++)

set(CMAKE_SYSTEM_NAME Android)
set(CMAKE_ANDROID_ARCH_ABI arm64-v8a)
set(CMAKE_ANDROID_NDK ${ANDROID_HOME}/ndk/${NDK_VERSION})
set(CMAKE_ANDROID_STL_TYPE c++_static)

add_executable(agent-mcs
  src/wa-voip-recording.c
  src/agent-mcs.c
)

target_include_directories(agent-mcs PRIVATE include)
target_compile_options(agent-mcs PRIVATE -Wall -Wextra -std=c11)
