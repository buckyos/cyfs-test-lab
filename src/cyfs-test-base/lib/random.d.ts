/**
 *
    \0	Null字符（\u0000）
    \b	退格符（\u0008）
    \t	水平制表符（\u0009）
    \n	换行符（\u000A）
    \v	垂直制表符（\u000B）
    \f	换页符（\u000C）
    \r	回车符（\u000D）
    \"	双引号（\u0022）
    \'	撇号或单引号（\u0027）
    \\	反斜杠（\u005C）
    \xXX	由 2 位十六进制数值 XX 指定的 Latin-1 字符
    \uXXXX	由 4 位十六进制数值 XXXX 指定的 Unicode 字符
    \XXX	由 1~3 位八进制数值（000 到 377）指定的 Latin-1 字符，可表示 256个 字符。如 \251 表示版本符号。注意，ECMAScript 3.0 不支持，考虑到兼容性不建议使用。
    
*/
export declare const ESC_char: {
    name: string;
    char: string;
}[];
export declare const testLanguage: {
    name: string;
    charts: string;
}[];
export declare const LANGUAGELIST: string[];
/**
 * ASCII
 * UNICODE
 * ISO-8859-1
 * GB2312
 * GBK
 * GB18030
 * UTF-8
 * UTF-16
*/
export declare const encodeType: string[];
/**
 * 随机图片生成
 */
export declare const IMGURL: string[];
/**
 * 将文件
 * @param source
 * @param target
 */
export declare function crop_image(source: string, target: string): Promise<void>;
export declare class RandomGenerator {
    static CHAR_SET: string;
    static CN_SET: string;
    static SYMBOL: string;
    static LANGUAGELIST: string[];
    static string(length?: number, cn?: number, symbol?: number): string;
    static accurate_string(length?: number): string;
    static language(length?: number, type?: number): string;
    static unicode(length: number): string;
    static accii(length: number): string;
    static encode(length: number, type: string): string;
    static integer(max: number, min?: number): number;
}
