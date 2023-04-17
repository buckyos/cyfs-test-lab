
/** 常见编码格式
 * 
 * ASCII
 * UNICODE
 * ISO-8859-1
 * GB2312
 * GBK
 * GB18030
 * UTF-8
 * UTF-16
*/
export const encodeType = ["ASCII", "UNICODE", "UTF-8", "UTF-16", "GBK", "GB18030", "GB2312", "ISO-8859-1"]




/**
 * 
 *  测试常见转义字符列表
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

export const Escape_Character = [
    {
        name: "\\0",
        char: "\0"
    },
    {
        name: "\\b",
        char: "\b"
    },
    {
        name: "\\t",
        char: "\t"
    },
    {
        name: "\\n",
        char: "\n"
    },
    {
        name: "\\v",
        char: "\v"
    },
    {
        name: "\\f",
        char: "\f"
    },
    {
        name: "\\r",
        char: "\r"
    },
    {
        name: "\\0",
        char: "\0"
    },
    {
        name: `\\"`,
        char: "\""
    },
    {
        name: "\\'",
        char: "\'"
    },
    {
        name: "\\\\",
        char: "\\"
    },
    {
        name: "\\xXX",
        char: "\x23"
    },
    {
        name: "\\uXXXX",
        char: "\u1234"
    },
    {
        name: "\\XXX",
        char: "\u1234"
    },
]


/**
 * 
 *  常见不同国家语言，用一段文字来生成随机文字
     * 汉语-简体
     * 汉语-繁体
     * 英语
     * 日语
     * 法语
     * 德语
     * 俄语
     * 韩语
     * 西班牙语
     * 葡萄牙语
     * 意大利语
     * 越南语
     * 阿拉伯语
     * 印尼语
     * 泰语

*/
const Simplified_Chinese = "基于cyfsBDT协议打造的DECApp除了与生俱来的去中心化传输快等特性外还具备数字身份数据确权变现NFT永不停服等核心功能在使用过程中你不必担心隐私泄露数据丢失大数据杀熟等问题抢先使用快人一步感受Web30价值传递的魅力";
const Traditional_Chinese = "基於cyfsBDT協議打造的DECApp除了與生俱來的去中心化傳輸快等特性外還具備數字身份數據確權變現NFT永不停服等核心功能在使用過程中你不必擔心隱私泄露數據丟失大數據殺熟等問題搶先使用快人一步感受價值傳遞的魅力";
const English = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUresolveWXYZ0123456789";
const Japanese = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼ ぱぴぷぺぽ";
const French = "BasésurleprotocolecyfsBDTconstruitDECApp";
const German = "DECApp, basierend auf cyfsBDT, verfügt über neben seinen uralten eigenschaften wie der notwendigkeit der centurialen übertragung resolveon daten, wie dem bedürfnis nach digitalen daten, unalt zu werden und im zuge seiner nutzung keine angst vor dem verlust großer datenverlust Oder dem entweichen großer daten haben muss, um eine schnelle verwendung des charismatischen kontakts resolveon Web30 auslösen zu können"
const korean = "cyfsbdt 프로토콜 기반의 decapp는 탈중심화 신속한 전송 기능 외에도 디지털 신원 데이터 확인 권리 환원 nft 무제한 복권과 같은 핵심 기능을 갖추고 있다. 사용 중 프라이버시 유출 데이터 손실 빅데이터 익싱 등 걱정 없이 빠른 사용자는 한 번에 web30의 가치를 느낄 수 있다";
const Spanish = "Basado en el protocolo cyfsBDT, DECApp, además de las características innatas de transferencia descentralizada rápida, también tiene la identidad digital de datos de la verdad realización NFT nunca parar de usar funciones centrales, como no tiene que preocuparse por la violación de privacidad durante el uso pérdida de datos big data matanza problemas como anticipar el uso de la persona rápida un paso para sentir el encanto de la entrega de valor Web30"
const Russian = "DECApp, построенный на протоколе cyfsfsbdt, имеет в дополнение к врожденным свойствам децентрализованной передачи данных, которые позволяют получить доступ к централизованным функциям, таким как передача NFT, которая никогда не прерывается, и вы не должны беспокоиться о Том, что в ходе использования вы не должны беспокоиться о Том, что конфиденциальность может быть раскрыта, что данные потеряны, а также о Том, что вы можете использовать очарование быстрых людей, чтобы почувствовать передачу Web30"
const Portuguese = "DECApp construído com base no protocolo cyfsBDT, além das características de transmissão descentralizada e rápida inato, também tem o poder de precisão de dados de identidade digital para realizar NFT nunca parar de vestir e outras funções principais no processo de uso você não precisa se preocupar com vazamento de privacidade perda de dados big data matança e outros problemas antes de usar a pessoa rápida em um passo para sentir o encanto da entrega de valor Web30"
const Italian = "La RFP, basata sul protocollo cyfsBDT, oltre alle caratteristiche innate come la trasmissione rapida dei dati di identificazione digitale, ha funzioni centrali come la registrazione dei dati di identificazione digitale che non sono mai in grado di arrestare"
const Vietnamese = "DECApp được xây dựng dựa trên giao thức cyfsBDT bên cạnh những đặc điểm bẩm sinh về việc truyền tải phân cấp nhanh chóng và những thứ tương tự nó cũng có những chức năng cốt lõi như xác nhận nhận dạng kỹ thuật số NFT không bao giờ ngừng sử dụng bạn không cần phải lo lắng về việc tiết lộ thông tin cá nhân mất đi dữ liệu và những vấn đề về việc sử dụng nhanh hơn để cảm nhận sự quyến rũ của việc truyền tải giá trị Web30"
const India = "DECApp, dibentuk dengan protokol cyfsBDT, dilengkapi dengan fitur inti seperti transfer decent deactive data digital yang dapat diubah secara cepat dan NFT tidak pernah gagal dalam fungsi inti ketika digunakan anda tidak perlu khawatir tentang pertanyaan seperti kebocoran data data besar yang hilang precognment anda dapat menggunakan manusia cepat satu langkah untuk merasakan daya tarik dari pengiriman nilai 30 webcam"
const Arabic = "(Decapp)، الذي يستند إلى اتفاق CyFSBDT)، بالإضافة إلى خاصيته الطبيعية مثل سرعة النقل المركزي السريع، لديه وظيفة أساسية مثل تحويل NFT إلى الأبد، دون أن يخشى المرء أن يستخدم قبل مرور قيمة Web30 في مسائل مثل فقدان البيانات الخصوصية، أو نضوج البيانات الضخمة"
const Thai = "นอกจากนี้ยังมีคุณสมบัติดิจิตอลที่เกิดจากข้อตกลงไซเอฟบีดีที";

export enum language_type {
    Simplified_Chinese, // 简体中文
    Traditional_Chinese, // 繁体中文
    English, // 英语
    Japanese, // 日语
    French, // 法语
    German, // 德语
    korean, // 韩语
    Russian, //俄语
    Spanish, // 西班牙语
    Portuguese, // 葡萄牙语
    Italian, // 意大利语
    Vietnamese,  // 越南语
    India, // 印度语
    Arabic, // 阿拉伯语
    Thai, // 泰语
 }
 export const get_language_list = (type:language_type):string=>{
    switch(type){
        case language_type.Simplified_Chinese : {
            return Simplified_Chinese;
        }
        case language_type.Traditional_Chinese : {
            return Traditional_Chinese;
        }
        case language_type.English : {
            return English;
        }
        case language_type.Japanese : {
            return Japanese;
        }
        case language_type.French : {
            return French;
        }
        case language_type.German : {
            return German;
        }
        case language_type.korean : {
            return korean;
        }
        case language_type.Russian : {
            return Russian;
        }
        case language_type.Spanish : {
            return Spanish;
        }
        case language_type.Portuguese : {
            return Portuguese;
        }
        case language_type.Italian : {
            return Italian;
        }
        case language_type.Vietnamese : {
            return Vietnamese;
        }
        case language_type.India : {
            return India;
        }
        case language_type.Arabic : {
            return Arabic;
        }
        case language_type.Thai : {
            return Thai;
        }
    }
 }


