const { Log } = require('../../models/log/log.model');

const LogLevel = {
    ERROR: 'error',
    INFO: 'info',
    DEBUG: 'debug'
}

const LogStream = {
    CONSOLE: 'console',
    FILE: 'file',
    DATABASE: 'database'
}

const writeDatabase = (logLevel, source, position, message) => {
    const log = new Log({ logLevel, source, position, message });

    try {
        const logDoc = await log.save();
    } catch (e) {
        console.log(e);
    }
}

const writeConsole = (logLevel, message) => {
    console.log(`logLeve : ${logLevel}, message : ${message} .`);
}

const writeFile = (logLevel, message) => { }



class Logger {

    writeMethod;

    constructor(logStream) {
        this.setWriteStream(logStream);
    }

    setWriteStream = (stream) => {
        switch (stream) {
            case LogStream.DATABASE:
                this.writeMethod = writeDatabase;
                break;

            case LogStream.FILE:
                this.writeMethod = writeFile;
                break;

            case LogStream.CONSOLE:
                this.writeMethod = writeConsole;
                break;

            default:
                this.writeMethod = writeDatabase;
                break;
        }
    };

    logMassage = (logLevel, source, position, message) => {
        let messageStringify;
        if (this.writeMethod == undefined) {
            this.setWriteStream();
        }

        if(typeof message === "object") {
            messageStringify = JSON.stringify(message);
        }
        this.writeMethod(logLevel, source, position, messageStringify);
    };
}


module.exports = {
    Logger,
    LogLevel,
    LogStream
}
