

/* regex */

const alphaAndSpaceRegex = /^[a-zA-Z]+( [a-zA-Z]+)*$/;
const ilPostcodeRegex = /^\d{5}(\d{2})?$/


/* clas defenition */

class ValidationService {
    
    constructor() { }
    
    // existens
    static isObjectNullOrUndefined(obj) {
        return (obj === null || obj === undefined);
    }

    static isStringUndefinedOrEmpty(str) {
        return (str === null || str === undefined || str === '') ;
    }

    static isString(str) {
        return typeof str === 'string';
    }

    static isObjectEmpty(obj) {
        if(typeof obj === 'object') {
            return Object.keys(obj).length == 0;
        } else {
            return false;
        }
    }


    // patters
    static isStringTrimAlpaWordsSeries(str) {
        if(typeof str === 'string') {
            return alphaAndSpaceRegex.test(str);
        } else {
            return false;
        }
    }

    static isParseILPostcode(stringOrNumber) {
        if(typeof stringOrNumber === 'string' || typeof stringOrNumber === 'number') {
            return ilPostcodeRegex.test(stringOrNumber);
        } else {
            return false;
        }
    }
    

    // complex
    /*
    * @param { day : Number, month : Number, year : Number } birthDate contains year, month, day fields.
    * @returns true if the fields year, month, day all numeric and follow the calender rulls. 
    */
    static validateBirthDateObject (birthDate) {
       try {
           const y = parseInt(birthDate.year);
           const m = parseInt(birthDate.month);
           const d = parseInt(birthDate.day);
           const curYear = new Date().getFullYear();
           if (!_.inRange(y, 1900, curYear)) {
               return false;
           }
           if (!_.inRange(m, 1, 12)) {
               return false;
           }
           switch (m) {
               case 2:
                   if ((y % 4 == 0 && _.inRange(d, 1, 29)) || _.inRange(d, 1, 28)) {
                       return true;
                   }
                   break;
               case 1 | 3 | 5 | 7 | 8 | 10 | 12:
                   if (_.inRange(d, 1, 31)) {
                       return true;
                   }
                   break;
   
               default:
                   if (_.inRange(d, 1, 30)) {
                       return true;
                   }
                   break;
           }
           return false;
       } catch (e) {
           console.log(e);
           return false;
       }
   }

}

module.exports = {
    ValidationService
}