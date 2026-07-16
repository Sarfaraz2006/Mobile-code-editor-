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
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream
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

                val pidArray = IntArray(1)
                val args = arrayOf("--login")
                val env = arrayOf(
                    "TERM=xterm-256color",
                    "PATH=/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets:/system/bin:/system/xbin",
                    "HOME=/data/data/com.termux/files/home",
                    "PREFIX=/data/data/com.termux/files/usr",
                    "PWD=/data/data/com.termux/files/home"
                )
                
                ptyFd = JNI.createSubprocess(
                    "/data/data/com.termux/files/usr/bin/bash",
                    "/data/data/com.termux/files/home",
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
        val filesDir = File("/data/data/com.termux/files")
        val prefixDir = File(filesDir, "usr")
        val bashFile = File(prefixDir, "bin/bash")
        val homeDir = File(filesDir, "home")

        if (bashFile.exists()) {
            return true
        }

        sendEvent("onShellData", "\r\n\u001b[1;33m[Termux Bootstrap Environment Not Found]\u001b[0m\r\n")
        sendEvent("onShellData", "\u001b[1;36m[Initializing Native Standalone Termux Environment...]\u001b[0m\r\n")

        if (!filesDir.exists()) filesDir.mkdirs()
        if (!homeDir.exists()) homeDir.mkdirs()

        val abi = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"
        val zipName = when {
            abi.contains("arm64") -> "bootstrap-aarch64.zip"
            abi.contains("x86_64") -> "bootstrap-x86_64.zip"
            abi.contains("v7") || abi.contains("arm") -> "bootstrap-arm.zip"
            else -> "bootstrap-i686.zip"
        }

        val urlString = "https://github.com/termux/termux-packages/releases/download/bootstrap-2024.11.23-r1%2Bapt-android-7/$zipName"
        sendEvent("onShellData", "Downloading $zipName...\r\n")

        val tempZipFile = File(filesDir, "bootstrap.zip")
        try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.instanceFollowRedirects = true
            
            var status = connection.responseCode
            var redirectUrl = urlString
            if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == 307 || status == 308) {
                redirectUrl = connection.getHeaderField("Location")
            }

            if (!downloadFile(redirectUrl, tempZipFile)) {
                return false
            }
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mNetwork download error: ${e.message}\u001b[0m\r\n")
            return false
        }

        return extractBootstrap(tempZipFile, prefixDir)
    }

    private fun downloadFile(urlString: String, destFile: File): Boolean {
        try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.instanceFollowRedirects = true
            val inputStream = connection.inputStream
            val outputStream = FileOutputStream(destFile)
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
            }
            outputStream.close()
            inputStream.close()
            return true
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mDownload writing error: ${e.message}\u001b[0m\r\n")
            return false
        }
    }

    private fun extractBootstrap(zipFile: File, prefixDir: File): Boolean {
        sendEvent("onShellData", "\u001b[1;36mExtracting Bootstrap Environment...\u001b[0m\r\n")
        val stagingDir = File(prefixDir.parentFile, "usr-staging")
        if (stagingDir.exists()) stagingDir.deleteRecursively()
        stagingDir.mkdirs()

        val symlinks = ArrayList<Pair<String, String>>()
        val buffer = ByteArray(8192)

        try {
            val zipInput = ZipInputStream(FileInputStream(zipFile))
            var zipEntry = zipInput.nextEntry
            while (zipEntry != null) {
                val entryName = zipEntry.name
                if (entryName == "SYMLINKS.txt") {
                    val reader = BufferedReader(InputStreamReader(zipInput))
                    var line = reader.readLine()
                    while (line != null) {
                        val parts = line.split("←")
                        if (parts.size == 2) {
                            val oldPath = parts[0]
                            val newPath = stagingDir.absolutePath + "/" + parts[1]
                            symlinks.add(Pair(oldPath, newPath))
                            File(newPath).parentFile?.mkdirs()
                        }
                        line = reader.readLine()
                    }
                } else {
                    val targetFile = File(stagingDir, entryName)
                    if (zipEntry.isDirectory) {
                        targetFile.mkdirs()
                    } else {
                        targetFile.parentFile?.mkdirs()
                        val outStream = FileOutputStream(targetFile)
                        var readBytes = zipInput.read(buffer)
                        while (readBytes != -1) {
                            outStream.write(buffer, 0, readBytes)
                            readBytes = zipInput.read(buffer)
                        }
                        outStream.close()

                        if (entryName.startsWith("bin/") || entryName.startsWith("libexec") ||
                            entryName.startsWith("lib/apt/apt-helper") || entryName.startsWith("lib/apt/methods")) {
                            Os.chmod(targetFile.absolutePath, 448) // 0700 octal is 448 decimal
                        }
                    }
                }
                zipEntry = zipInput.nextEntry
            }
            zipInput.close()

            sendEvent("onShellData", "\u001b[1;36mCreating Unix symlinks...\u001b[0m\r\n")
            for (symlink in symlinks) {
                try {
                    Os.symlink(symlink.first, symlink.second)
                } catch (e: Exception) {
                    // ignore
                }
            }

            if (prefixDir.exists()) prefixDir.deleteRecursively()
            if (!stagingDir.renameTo(prefixDir)) {
                sendEvent("onShellData", "\u001b[1;31mInstallation failed during staging directory rename\u001b[0m\r\n")
                return false
            }

            zipFile.delete()
            sendEvent("onShellData", "\u001b[1;32m[Termux Environment Installed Successfully!]\u001b[0m\r\n")
            return true
        } catch (e: Exception) {
            sendEvent("onShellData", "\u001b[1;31mExtraction error: ${e.message}\u001b[0m\r\n")
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
