package com.emergent.portabledevstudio.nojt5o

import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import kotlin.concurrent.thread

class LocalTerminalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var ptyFd: Int = -1
    private var pfd: ParcelFileDescriptor? = null
    private var outputStream: FileOutputStream? = null
    private var isRunning = false
    private var shellPid: Int = -1

    override fun getName(): String {
        return "LocalTerminalModule"
    }

    @ReactMethod
    fun startShell(cwd: String) {
        if (isRunning) return
        isRunning = true
        thread(start = true) {
            try {
                val pidArray = IntArray(1)
                val args = arrayOf("--login")
                val env = arrayOf(
                    "TERM=xterm-256color",
                    "PATH=/system/bin:/system/xbin:/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets",
                    "HOME=$cwd",
                    "PWD=$cwd"
                )
                
                ptyFd = JNI.createSubprocess(
                    "/system/bin/sh",
                    cwd,
                    args,
                    env,
                    pidArray,
                    24, // rows
                    80, // cols
                    10, // cellWidth
                    20  // cellHeight
                )
                
                shellPid = pidArray[0]
                if (ptyFd < 0) {
                    sendEvent("onShellData", "\r\nFailed to allocate native PTY.\r\n")
                    closeShell()
                    return@thread
                }

                pfd = ParcelFileDescriptor.adoptFd(ptyFd)
                val inputStream = FileInputStream(pfd!!.fileDescriptor)
                outputStream = FileOutputStream(pfd!!.fileDescriptor)

                // Read output thread
                thread(start = true) {
                    val buffer = ByteArray(4096)
                    try {
                        while (isRunning) {
                            val read = inputStream.read(buffer)
                            if (read == -1) break
                            val data = String(buffer, 0, read, Charsets.UTF_8)
                            sendEvent("onShellData", data)
                        }
                    } catch (e: Exception) {
                        sendEvent("onShellData", "\r\n[Shell Output closed: ${e.message}]\r\n")
                    } finally {
                        closeShell()
                    }
                }

                // Wait for process thread
                thread(start = true) {
                    try {
                        val exitCode = JNI.waitFor(shellPid)
                        sendEvent("onShellData", "\r\n[Process exited with status $exitCode]\r\n")
                    } catch (e: Exception) {
                        // ignore
                    } finally {
                        closeShell()
                    }
                }

            } catch (e: Exception) {
                sendEvent("onShellData", "\r\nFailed to start native PTY shell: ${e.message}\r\n")
                closeShell()
            }
        }
    }

    @ReactMethod
    fun writeShellData(data: String) {
        thread(start = true) {
            try {
                outputStream?.let {
                    it.write(data.toByteArray(Charsets.UTF_8))
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
            outputStream?.close()
        } catch (e: IOException) {}
        try {
            pfd?.close()
        } catch (e: IOException) {}
        
        if (ptyFd >= 0) {
            try {
                JNI.close(ptyFd)
            } catch (e: Exception) {}
            ptyFd = -1
        }
        
        pfd = null
        outputStream = null
        shellPid = -1
        sendEvent("onShellExit", null)
    }

    private fun sendEvent(eventName: String, params: String?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
