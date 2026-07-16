package com.emergent.portabledevstudio.nojt5o

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.lang.Process
import java.lang.ProcessBuilder
import kotlin.concurrent.thread

class LocalTerminalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var process: Process? = null
    private var writer: java.io.BufferedWriter? = null
    private var isRunning = false

    override fun getName(): String {
        return "LocalTerminalModule"
    }

    @ReactMethod
    fun startShell(cwd: String) {
        if (isRunning) return
        isRunning = true
        thread(start = true) {
            try {
                val pb = ProcessBuilder("/system/bin/sh")
                pb.directory(File(cwd))
                val env = pb.environment()
                env["TERM"] = "xterm-256color"
                val currentPath = env["PATH"] ?: ""
                env["PATH"] = "$currentPath:/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets"
                
                val proc = pb.start()
                process = proc
                writer = proc.outputStream.bufferedWriter()

                // Read output thread
                thread(start = true) {
                    val reader = proc.inputStream.bufferedReader()
                    val buffer = CharArray(4096)
                    try {
                        while (isRunning) {
                            val read = reader.read(buffer)
                            if (read == -1) break
                            val data = String(buffer, 0, read)
                            sendEvent("onShellData", data)
                        }
                    } catch (e: Exception) {
                        sendEvent("onShellData", "\r\n[Shell Output Stream closed: ${e.message}]\r\n")
                    } finally {
                        closeShell()
                    }
                }

                // Read error thread
                thread(start = true) {
                    val reader = proc.errorStream.bufferedReader()
                    val buffer = CharArray(4096)
                    try {
                        while (isRunning) {
                            val read = reader.read(buffer)
                            if (read == -1) break
                            val data = String(buffer, 0, read)
                            sendEvent("onShellData", data)
                        }
                    } catch (e: Exception) {
                        // ignore
                    }
                }

                proc.waitFor()
            } catch (e: Exception) {
                sendEvent("onShellData", "\r\nFailed to start native shell: ${e.message}\r\n")
            } finally {
                closeShell()
            }
        }
    }

    @ReactMethod
    fun writeShellData(data: String) {
        thread(start = true) {
            try {
                writer?.let {
                    it.write(data)
                    it.flush()
                }
            } catch (e: Exception) {
                sendEvent("onShellData", "\r\n[Failed to write stdin: ${e.message}]\r\n")
            }
        }
    }

    @ReactMethod
    fun closeShell() {
        if (!isRunning) return
        isRunning = false
        try {
            process?.destroy()
        } catch (e: Exception) {}
        process = null
        writer = null
        sendEvent("onShellExit", null)
    }

    private fun sendEvent(eventName: String, params: String?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
