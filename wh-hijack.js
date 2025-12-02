var g_data_location = "/data/data/com.whatsapp/cache/voip/"
var g_filename = "";
let g_fos_obj = null;
function toHex(byteArray) {
    return Array.prototype.map.call(
        new Uint8Array(byteArray),
        x => ('00' + x.toString(16)).slice(-2)
    ).join(' ');
}

function getIID(name) {
  const iid_ptr = Module.findExportByName("libOpenSLES.so", name);
  if (!iid_ptr) {
      console.log("[FRIDA] [!] IID not found:", name);
      return null;
  }
  return iid_ptr.readPointer();
}

const IID_BUFFERQUEUE = getIID("SL_IID_BUFFERQUEUE");
// console.log("[FRIDA] IID_BUFFERQUEUE : " + IID_BUFFERQUEUE + "\n" + toHex(IID_BUFFERQUEUE.readByteArray(16)));
const IID_ANDROIDSIMPLEBUFFERQUEUE = getIID("SL_IID_ANDROIDSIMPLEBUFFERQUEUE");
// console.log("[FRIDA] IID_ANDROIDSIMPLEBUFFERQUEUE : " + IID_ANDROIDSIMPLEBUFFERQUEUE + "\n" + toHex(IID_ANDROIDSIMPLEBUFFERQUEUE.readByteArray(16)));
const IID_RECORD = getIID("SL_IID_RECORD");
// console.log("[FRIDA] IID_RECORD : " + IID_RECORD + "\n" + toHex(IID_RECORD.readByteArray(16)));
const IID_PLAY = getIID("SL_IID_PLAY");
// console.log("[FRIDA] IID_PLAY : " + IID_PLAY + "\n" + toHex(IID_PLAY.readByteArray(16)));
const IID_ENGINE = getIID("SL_IID_ENGINE");
// console.log("[FRIDA] IID_ENGINE : " + IID_ENGINE + "\n" + toHex(IID_ENGINE.readByteArray(16)));

function dump_vtable(vt) {
    for (let i = 0; i < 25; i++) {
        let fn = vt.add(i * Process.pointerSize).readPointer();
        console.log("[FRIDA] vtable[" + i + "] = " + fn);
    }
}

function generate_random_string(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function timestamp() {
  return new Date().toISOString(); // e.g. "2025-01-25T14:22:05.123Z"
}

function open_pcm_file(filepath) {
  if (g_fos_obj == null) {
      var file_class = Java.use("java.io.File");
      var fos_class = Java.use("java.io.FileOutputStream");
      var file_obj = file_class.$new(filepath);
      g_fos_obj = fos_class.$new(file_obj, /* append */ true);
      console.log("[FRIDA] [+] PCM output file opened:", filepath);
  }
}

function close_pcm_file(filepath) {
  if (g_fos_obj != null) {
    Java.perform(function() {
        g_fos_obj.close();
    });
    console.log("[FRIDA] [+] PCM output file closed");
  }
}

function buffer_to_array(ab) {
    const u8 = new Uint8Array(ab);
    const out = [];
    for (let i = 0; i < u8.length; i++) out.push(u8[i]);
    return out;
}

function dump_pcm_data(buffer_ptr, buffer_size) {
  if (g_fos_obj == null || buffer_size <= 0) return;
  var data = buffer_ptr.readByteArray(buffer_size);
  Java.perform(function() {
    if (!g_fos_obj) {
      return;
    }
    var byte_array = Java.array('byte', buffer_to_array(data));
    g_fos_obj.write(byte_array, 0, buffer_size);
    g_fos_obj.flush();  
  });
}

function iidEquals(a1, b1) {
  const a = a1.readByteArray(16);
  if (a == null) return false;
  const b = b1.readByteArray(16);
  if (b === null) return false;
  const a8 = new Uint8Array(a);
  const b8 = new Uint8Array(b);
  if (a8.length !== b8.length) return false;
  for (let i = 0; i < 16; i++) {
    if (a8[i] !== b8[i]) return false;
  }
  return true;
}

function get_audio_src(audio_src_ptr) {
  try {
    console.log("[FRIDA] audio_src_ptr : " + audio_src_ptr);
    const audio_src = audio_src_ptr.readPointer(); // SLDataSource
    console.log("[FRIDA] audio_src : " + audio_src);
    const p_locator = audio_src.readPointer();
    console.log("[FRIDA] p_locator : " + p_locator);
    const p_format = audio_src.add(Process.pointerSize).readPointer();
    console.log("[FRIDA] p_format : " + p_format);
    if (p_format == 0x0 || p_format == 0xffffffff) {
      return;
    }
    const format_type     = p_format.readU32();
    const num_channels    = p_format.add(4).readU32();
    const samples_per_sec  = p_format.add(8).readU32();
    const bits_per_sample  = p_format.add(12).readU32();
    const container_size  = p_format.add(16).readU32();
    const channel_mask    = p_format.add(20).readU32();
    const endianness     = p_format.add(24).readU32();
    console.log("[FRIDA]   format type:       " + format_type);
    console.log("[FRIDA]   num channels:      " + num_channels);
    console.log("[FRIDA]   sample rate:       " + samples_per_sec);
    console.log("[FRIDA]   bits/sample:       " + bits_per_sample);
    console.log("[FRIDA]   endian:            " + endianness);
    console.log("[FRIDA]   container_size:    " + container_size);
    console.log("[FRIDA]   channel_mask:      " + channel_mask);
  } catch (e) {
    console.error("PCM format read error:", e);
  }
}

function hook_realize(realize) {
  Interceptor.attach(realize, {
    onEnter: function(args) {
      // console.log("[FRIDA] Realize onEnter async : " + args[1]);
    },
    onLeave: function(retval) {
      // console.log("[FRIDA] Realize onLeave return value : " + retval);
    }
  });
}

function hook_get_interface(get_interface_ptr) {
  Interceptor.attach(get_interface_ptr, {
    onEnter: function(args) {
      this.iid = args[1];
      this.p_interface_ptr = args[2];
      // console.log("[FRIDA] GetInterface onEnter iid : " + this.iid + " p_interface_ptr : " + this.p_interface_ptr);
    },
    onLeave: function(retval) {
      // console.log("[FRIDA] GetInterface onLeave");
      // console.log("[FRIDA] IID : " + toHex(this.iid.readByteArray(16)));
      const p_interface = this.p_interface_ptr.readPointer();
      const vtble = p_interface.readPointer();
      // console.log("[FRIDA] Dumping vtable.");
      // dump_vtable(vtble);
      if (iidEquals(this.iid, IID_ENGINE)) {
        console.log("[FRIDA] Found IID_ENGINE : " + toHex(this.iid.readByteArray(16)));
        const create_audio_player_ptr = vtble.add(2 * Process.pointerSize).readPointer();
        hook_create_audio_player(create_audio_player_ptr);
        const create_audio_recorder_ptr = vtble.add(3 * Process.pointerSize).readPointer();
        hook_create_audio_recorder(create_audio_recorder_ptr);
      } else if (iidEquals(this.iid, IID_ANDROIDSIMPLEBUFFERQUEUE)) {
        console.log("[FRIDA] Found IID_ANDROIDSIMPLEBUFFERQUEUE : " + toHex(this.iid.readByteArray(16)));
        const enqueue_ptr = vtble.add(0 * Process.pointerSize).readPointer();
        // console.log(`[+] RECORD Enqueue @ ${enqueue_ptr}`);
        hook_enqueue(enqueue_ptr);
        const clear_ptr = vtble.add(1 * Process.pointerSize).readPointer();
        hook_clear(clear_ptr);
      } else if (iidEquals(this.iid, IID_BUFFERQUEUE)) {
        // console.log("[FRIDA] Found IID_BUFFERQUEUE : " + toHex(this.iid.readByteArray(16)));
        const clear_ptr = vtble.add(1 * Process.pointerSize).readPointer();
        hook_clear(clear_ptr);
      }
    }
  });
}

function hook_create_audio_player(create_audio_player_ptr) {
  Interceptor.attach(create_audio_player_ptr, {
    onEnter: function(args) {
      console.log("[FRIDA] CreateAudioPlayer onEnter");
      this.self_obj = args[0];
      this.p_player_ptr = args[1];
      this.p_audio_src_ptr = args[2];
      this.p_audio_snk_ptr = args[3];
      this.num_interfaces = args[4];
      this.p_interface_ids_ptr = args[5];
      this.p_interface_required_ptr = args[6];
      // console.log("[FRIDA] player ptr : " + this.p_player_ptr);
    },
    onLeave: function(retval) {
      console.log("[FRIDA] CreateAudioPlayer onLeave");
      if (retval.toInt32() == 0) {
        get_audio_src(this.p_audio_src_ptr);
        const p_player_obj = this.p_player_ptr.readPointer();
        // console.log("[FRIDA] player obj : " + p_player_obj);
        const vtble = p_player_obj.readPointer();
        // console.log("[FRIDA] vtable : " + vtble);
        const realize_ptr = vtble.add(0 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] Realize : " + realize_ptr);
        if (realize_ptr) {
          hook_realize(realize_ptr);
        }
        const resume_ptr = vtble.add(1 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] Resume : " + resume_ptr);
        const get_state_ptr = vtble.add(2 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] GetState : " + get_state_ptr);
        const get_interface_ptr = vtble.add(3 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] GetInterface : " + get_interface_ptr);
        if (get_interface_ptr) {
          hook_get_interface(get_interface_ptr);
        }
        const register_callback_ptr = vtble.add(4 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] RegisterCallback : " + register_callback_ptr);
      } else {
        console.log("[FRIDA] CreateAudioPlayer failed. ignoring.");
      }
    }
  });
}

function hook_create_audio_recorder(create_audio_recorder_ptr) {
  Interceptor.attach(create_audio_recorder_ptr, {
    onEnter: function(args) {
      console.log("[FRIDA] CreateAudioRecorder onEnter");
      this.self_obj = args[0];
      this.p_recorder_ptr = args[1];
      this.p_audio_src_ptr = args[2];
      this.p_audio_snk_ptr = args[3];
      this.num_interfaces = args[4];
      this.p_interface_ids_ptr = args[5];
      this.p_interface_required_ptr = args[6];
    },
    onLeave: function(retval) {
      console.log("[FRIDA] CreateAudioRecorder onLeave");
      if (retval.toInt32() == 0) {
        get_audio_src(this.p_audio_src_ptr);
        const p_recorder_obj = this.p_recorder_ptr.readPointer();
        // console.log("[FRIDA] recorder obj : " + p_recorder_obj);
        const vtble = p_recorder_obj.readPointer();
        // console.log("[FRIDA] vtable : " + vtble);
        const realize_ptr = vtble.add(0 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] Realize : " + realize_ptr);
        if (realize_ptr) {
          hook_realize(realize_ptr);
        }
        const resume_ptr = vtble.add(1 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] Resume : " + resume_ptr);
        const get_state_ptr = vtble.add(2 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] GetState : " + get_state_ptr);
        const get_interface_ptr = vtble.add(3 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] GetInterface : " + get_interface_ptr);
        if (get_interface_ptr) {
          hook_get_interface(get_interface_ptr);
        }
        const register_callback_ptr = vtble.add(4 * Process.pointerSize).readPointer();
        // console.log("[FRIDA] RegisterCallback : " + register_callback_ptr);
      } else {
        console.log("[FRIDA] CreateAudioPlayer failed. ignoring.");
      }
    }
  });
}

function hook_enqueue(enqueue_ptr) {
  Interceptor.attach(enqueue_ptr, {
    onEnter: function(args){
      // console.log("[FRIDA] Enqueue onEnter");
      const buffer_ptr = args[1];
      const buffer_size   = args[2].toInt32();
      // console.log(`[RECORD] PCM size=${buffer_size} buf=${buffer_ptr}`);
      if (buffer_ptr && !buffer_ptr.isNull() && buffer_size > 0) {
        // console.log("[FRIDA] [RECORD] dumping PCM data");
        dump_pcm_data(buffer_ptr, buffer_size);
      }
    }, 
    onLeave: function(retval) {
      // console.log("[FRIDA] Enqueue onLeave");
    }
  });
}

function hook_clear(clear_ptr) {
  Interceptor.attach(clear_ptr, {
    onEnter: function(args){
      // console.log("[FRIDA] Clear onEnter");
      const buffer_ptr = args[1];
      const buffer_size   = args[2].toInt32();
      // console.log(`[PLAYBACK] PCM size=${buffer_size} buf=${buffer_ptr}`);
      if (buffer_ptr && !buffer_ptr.isNull() && buffer_size > 0) {
        // console.log("[FRIDA] [PLAYBACK] dumping PCM data");
        dump_pcm_data(buffer_ptr, buffer_size);
      }
    },
    onLeave: function(retval) {
      // console.log("[FRIDA] Clear onLeave");
    }
  });
}

function install_hooks_for_sl_create_engine() {
  console.log("[FRIDA] Hooking slCreateEngine");
  var lib_opensles_so = "libOpenSLES.so";
  var exp_syms = Module.enumerateExports(lib_opensles_so);
  exp_syms.forEach(sym => {
    if (sym.name.includes("slCreateEngine")) {
      console.log("[FRIDA] Found slCreateEngine");
      Interceptor.attach(sym.address, {
        onEnter: function(args) {
          // console.log("[FRIDA] slCreateEngine onEnter " + " p_engine_ptr : " + args[0] + " num options : " + args[1] + " p_engine_options_ptr : " + args[2] + " num interfaces : " + args[3] + " p_interface_ids ptr : " + args[4] + " p_interface_required : " + args[5]);
          this.p_engine_ptr = args[0];
        },
        onLeave: function(retval) {
          // console.log("[FRIDA] slCreateEngine onLeave. return value : " + retval);
          if (!this.p_engine_ptr) {
            // console.log("[FRIDA] p_engine_ptr is null");
            return retval;
          }
          const p_engine_obj = this.p_engine_ptr.readPointer();
          // console.log("[FRIDA] p_engine object : " + p_engine_obj);
          if (p_engine_obj.isNull()) {
            // console.log("[FRIDA] p_engine object is NULL");
            return retval;
          }
          const vtble = p_engine_obj.readPointer();
          // console.log("[FRIDA] vtable : " + vtble);
          const realize_ptr = vtble.add(0 * Process.pointerSize).readPointer();
          // console.log("[FRIDA] Realize : " + realize_ptr);
          if (realize_ptr) {
            hook_realize(realize_ptr);
          }
          const resume_ptr = vtble.add(1 * Process.pointerSize).readPointer();
          // console.log("[FRIDA] Resume : " + resume_ptr);
          const get_state_ptr = vtble.add(2 * Process.pointerSize).readPointer();
          // console.log("[FRIDA] GetState : " + get_state_ptr);
          const get_interface_ptr = vtble.add(3 * Process.pointerSize).readPointer();
          // console.log("[FRIDA] GetInterface : " + get_interface_ptr);
          if (get_interface_ptr) {
            hook_get_interface(get_interface_ptr);
          }
          const register_callback_ptr = vtble.add(4 * Process.pointerSize).readPointer();
          // console.log("[FRIDA] RegisterCallback : " + register_callback_ptr);
        }
      });
    }
  });
}

function install_hooks_for_wa_calling_status() {
  console.log("[FRIDA] Hooking whatsapp calling status");
  var dlopen_addr = Module.findExportByName(null, "android_dlopen_ext");
  var lib_path = "";
  if (!dlopen_addr) {
    console.log("[FRIDA] dlopen not found.");
    return false;
  }
  Interceptor.attach(dlopen_addr, {
    onEnter: function(args) {
      lib_path = Memory.readCString(args[0]);
    },
    onLeave: function(retval) {
      if (lib_path.includes("libwhatsapp.so")) {
        var syms = Module.enumerateExports(lib_path);
        syms.forEach(sym => {
          if (sym.name.includes("Java_com_whatsapp_calling_voipcalling_Voip_startCall")) {
            Interceptor.attach(sym.address, {
              onEnter: function(args) {
                console.log("[FRIDA] Hijacked startCall.");
                var rand_str = generate_random_string();
                var current_time_stamp = timestamp();
                g_filename = rand_str + "-" + current_time_stamp;
                open_pcm_file(g_data_location + g_filename);
              },
              onLeave: function(retval2) {}
            });
          } else if (sym.name.includes("Java_com_whatsapp_calling_voipcalling_Voip_endCall")) {
            Interceptor.attach(sym.address, {
              onEnter: function(args) {
                console.log("[FRIDA] Hijacked endCall.");
              },
              onLeave: function(retval2) {
                g_fos_obj.flush();
                close_pcm_file(g_data_location + g_filename);
              }
            });
          } else if (sym.name.includes("Java_com_whatsapp_calling_voipcalling_Voip_acceptCall")) {
            Interceptor.attach(sym.address, {
              onEnter: function(args) {
                console.log("[FRIDA] Hijacked acceptCall.");
              },
              onLeave: function(retval2) {}
            });
          } else if (sym.name.includes("Java_com_whatsapp_calling_voipcalling_Voip_rejectCall")) {
            Interceptor.attach(sym.address, {
              onEnter: function(args) {
                console.log("[FRIDA] Hijacked rejectCall.");
              },
              onLeave: function(retval2) {}
            });
          }
        });
      }
    }
  });
}

function install_wa_hooks() {
  console.log("[FRIDA] Installing hooks for WhatsApp.")
  install_hooks_for_sl_create_engine();
  install_hooks_for_wa_calling_status();
}

install_wa_hooks();
