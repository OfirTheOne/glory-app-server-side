const { Log } = require('../../models/log/log.model');

/*********** Enums ***********/
const LogLevel = {
    ERROR: 'error',
    INFO: 'info',
    DEBUG: 'debug',
    WARN: 'warn'
}

const LogStream = {
    CONSOLE: 'console',
    FILE: 'file',
    DATABASE: 'database'
}
/*****************************/

const objToString = (obj) => {
    let objStringify = '';
    if (typeof obj != "string") {
        try {
            objStringify = JSON.stringify(obj);
        } catch(e) {
            console.log(e);
            objStringify = 'cyclic object value'; // in case of cyclic object value
        }
    } else {
        objStringify = obj;
    }
    return objStringify;
}

/*********** Stream write methods ***********/
const writeDatabase = async (level, source, message, options = undefined) => {
    const log = new Log({ 
        logLevel: level, 
        source, 
        message: (message ? message : ""),
        position: (options ? options.position: ""), 
    });

    try {
        const logDoc = await log.save();
    } catch (e) {
        console.log(e);
    }
}

const writeConsole = async (level, source, message, options = undefined) => {
    console.log('\n');

    console.log(`${level}: (source) ${source} : ${message}`);
    if(options) {
        options.position ? console.log(`${ options.position},`): null;
        options.params ? console.log(`${ objToString(options.params)}`): null;
    }
    
}

const writeFile = async (level, source, message, options = undefined) => { }

/********************************************/


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



    async log(level, source, message, options) {
        let messageStringify;
        
        if (this.writeMethod == undefined) {
            this.setWriteStream();
        }
        
        messageStringify = objToString(message);
        
        try {
            await this.writeMethod(level, source, messageStringify, options);
        } catch (e) {
            console.log(e);

        }
    };
    
    async debug(source, message, options) {
        await this.log( LogLevel.DEBUG, source, message, options);
    }

    async warn(source, message, options) {
        await this.log( LogLevel.WARN, source, message, options);
    }

    async info(source, message, options) {
        await this.log(LogLevel.INFO, source, message, options);
    }

    async error(source, message, options) {
        await this.log( LogLevel.ERROR, source, message, options);
    }
 
}


module.exports = {
    Logger,
    LogLevel,
    LogStream
}
