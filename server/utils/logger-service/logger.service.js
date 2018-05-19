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

const writeDatabase = async (logLevel, source, position, message) => {
    const log = new Log({ logLevel, source, position, message });

    try {
        const logDoc = await log.save();
    } catch (e) {
        console.log(e);
    }
}

const writeConsole = async (logLevel, message) => {
    console.log(`logLeve : ${logLevel}, message : ${message} .`);
}

const writeFile = async (logLevel, message) => { }



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

    logMassage = async (logLevel, source, position, message) => {
        let messageStringify;
        if (this.writeMethod == undefined) {
            this.setWriteStream();
        }

        if(typeof message === "object") {
            messageStringify = JSON.stringify(message);
        }
        
        try {
            await this.writeMethod(logLevel, source, position, messageStringify);
        } catch (e) {
            console.log(e);
        }
    };
}


module.exports = {
    Logger,
    LogLevel,
    LogStream
}
