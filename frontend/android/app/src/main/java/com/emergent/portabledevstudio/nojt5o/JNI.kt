package com.emergent.portabledevstudio.nojt5o

object JNI {
    init {
        System.loadLibrary("termux")
    }

    external fun createSubprocess(
        cmd: String,
        cwd: String,
        args: Array<String>?,
        envVars: Array<String>?,
        processIdArray: IntArray,
        rows: Int,
        columns: Int,
        cellWidth: Int,
        cellHeight: Int
    ): Int

    external fun setPtyWindowSize(fd: Int, rows: Int, cols: Int, cellWidth: Int, cellHeight: Int)

    external fun setPtyUTF8Mode(fd: Int)

    external fun waitFor(pid: Int): Int

    external fun close(fd: Int)
}
