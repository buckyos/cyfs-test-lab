export class ValidatorHelper {
    public static notEmpty(s: string): {succ: boolean, msg?: string} {
        if (!s || !s.length) {
            return {succ: false, msg: '内容不能为空'};
        }
        return {succ: true};
    }

    //输入的内容可以作为文件内容
    public static validFileName(value: string): {succ: boolean, msg?: string} {
        if (!value || !value.length) {
            return {succ: false, msg: '内容不能为空'};
        }

        if (value.indexOf(' ') !== -1) {
            return {succ: false, msg: '不能包含空格'};
        }

        for (let i = 0; i < value.length; i++) {
            if (value.charCodeAt(i) >= 255) {
                return {succ: false, msg: '不能包含中文'};
            }
        }

        var fileName = /\||<|>|\?|\*|:|\/|\\|"/;
        if (fileName.test(value)) {
            return {succ: false, msg: '不能包含特殊字符'};
        }

        return {succ: true};
    }

    public static validVersion(version: string): {succ: boolean, msg?: string} {
        try {
            if (!version || !version.length) {
                return {succ: false, msg: '版本号不能为空'};
            }

            let fields: string[] = version.split('.');
            if (fields.length !== 2) {
                return {succ: false, msg: '格式错误,必须两级版本号,如:1.1'};
            }
            
            let i: number = parseInt(fields[0]);
            if (Number.isNaN(i) || !Number.isInteger(i)) {
                return {succ: false, msg: '格式错误,版本号只能包含数字和小数点,如:1.1'};
            }

            i = parseInt(fields[1]);
            if (Number.isNaN(i) || !Number.isInteger(i)) {
                return {succ: false, msg: '格式错误,版本号只能包含数字和小数点,如:1.1'};
            }

            return {succ: true};
        } catch (err) {
            return {succ: false, msg: '格式错误,版本号只能包含数字和小数点,如:1.1'};
        }
    } 


}