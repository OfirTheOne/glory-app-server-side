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

const writeConsole = async (logLevel, source, position, message) => {
    console.log('\n');
    console.log(`log level : ${logLevel}`);
    console.log(`source : ${source}`);
    console.log(`message : ${message}`);
    position? console.log(`position : ${position}`) : 0;
}

const writeFile = async (logLevel, message) => { }



class Logger {

    constructor(logStream) {
        this.writeMethod = undefined;
        this.setWriteStream(logStream);
    }

    setWriteStream(stream) {
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

    async logMassage(logLevel, source, position, message) {
        let messageStringify;
        if (this.writeMethod == undefined) {
            this.setWriteStream();
        }

        if (typeof message != "string") {
            try {
                messageStringify = JSON.stringify(message);
            } catch(e) {
                console.log(e);
                messageStringify = ''; // in case of cyclic object value
            }
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
