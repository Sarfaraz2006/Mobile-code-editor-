package com.emergent.portabledevstudio.nojt5o

import android.os.Build
import android.os.ParcelFileDescriptor
import android.system.Os
import android.util.Pair
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.*
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
                if (!ensureBootstrapInstalled()) {
                    isRunning = false
                    return@thread
                }

                val filesDir = reactApplicationContext.filesDir
                val rootfsPath = File(filesDir, "ubuntu-rootfs").absolutePath
                val prootPath = File(filesDir, "proot").absolutePath
                val tmpDir = File(filesDir, "tmp")
                if (!tmpDir.exists()) tmpDir.mkdirs()

                val pidArray = IntArray(1)
                val args = arrayOf(
                    "-r", rootfsPath,
                    "-0",
                    "-w", "/root",
                    "-b", "/dev",
                    "-b", "/proc",
                    "-b", "/sys",
                    "/bin/bash",
                    "--login"
                )
                val env = arrayOf(
                    "TERM=xterm-256color",
                    "HOME=/root",
                    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                    "PROOT_TMPDIR=${tmpDir.absolutePath}"
                )
                
                ptyFd = JNI.createSubprocess(
                    prootPath,
                    rootfsPath,
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

    private fun ensureBootstrapInstalled(): Boolean {
        val filesDir = reactApplicationContext.filesDir
        val rootfsDir = File(filesDir, "ubuntu-rootfs")
        val bashFile = File(rootfsDir, "bin/bash")
        val prootFile = File(filesDir, "proot")

        if (bashFile.exists() && prootFile.exists()) {
            return true
        }

        sendEvent("onShellData", "\r\n\u001b[1;33m[Ubuntu Rootfs Environment Not Found]\u001b[0m\r\n")
        sendEvent("onShellData", "\u001b[1;36m[Initializing Standalone Ubuntu PRoot Environment...]\u001b[0m\r\n")

        if (!filesDir.exists()) filesDir.mkdirs()

        // 1. Copy proot from assets
        sendEvent("onShellData", "Copying proot binary...\r\n")
        if (!copyAssetToFile("proot", prootFile)) {
            return false
        }
        // Set execute permissions for proot
        try {
            Os.chmod(prootFile.absolutePath, 448) // 0700 octal is 448 decimal
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mFailed to set execute permission on proot: ${e.message}\u001b[0m\r\n")
            return false
        }

        // 2. Copy ubuntu-rootfs.tar.gz from assets
        val tempTarFile = File(filesDir, "ubuntu-rootfs.tar.gz")
        sendEvent("onShellData", "Copying Ubuntu rootfs tarball...\r\n")
        if (!copyAssetToFile("ubuntu-rootfs.tar.gz", tempTarFile)) {
            return false
        }

        // 3. Extract rootfs
        if (!extractRootfs(tempTarFile, rootfsDir)) {
            return false
        }

        // 4. Setup resolv.conf for networking inside rootfs
        try {
            val resolvConfDir = File(rootfsDir, "etc")
            if (!resolvConfDir.exists()) resolvConfDir.mkdirs()
            val resolvConfFile = File(resolvConfDir, "resolv.conf")
            FileWriter(resolvConfFile).use { writer ->
                writer.write("nameserver 8.8.8.8\nnameserver 1.1.1.1\n")
            }
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;33m[Warning: Failed to setup resolv.conf: ${e.message}]\u001b[0m\r\n")
        }

        return true
    }

    private fun copyAssetToFile(assetName: String, destFile: File): Boolean {
        try {
            reactApplicationContext.assets.open(assetName).use { input ->
                FileOutputStream(destFile).use { output ->
                    input.copyTo(output)
                }
            }
            return true
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mFailed to copy asset $assetName: ${e.message}\u001b[0m\r\n")
            return false
        }
    }

    private fun extractRootfs(tarFile: File, destDir: File): Boolean {
        sendEvent("onShellData", "\r\n\u001b[1;36mExtracting Ubuntu Rootfs (this may take a minute)...\u001b[0m\r\n")
        if (!destDir.exists()) {
            destDir.mkdirs()
        }
        try {
            val process = ProcessBuilder()
                .command("tar", "-xzf", tarFile.absolutePath, "-C", destDir.absolutePath)
                .redirectErrorStream(true)
                .start()
            
            // Read output to avoid blocking
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            var line = reader.readLine()
            while (line != null) {
                line = reader.readLine()
            }
            val exitCode = process.waitFor()
            if (exitCode != 0) {
                sendEvent("onShellData", "\u001b[1;31mExtraction failed with exit code $exitCode\u001b[0m\r\n")
                return false
            }
            tarFile.delete() // clean up to save space
            sendEvent("onShellData", "\u001b[1;32m[Ubuntu Rootfs Extracted Successfully!]\u001b[0m\r\n")
            return true
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mExtraction failed: ${e.message}\u001b[0m\r\n")
            return false
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
